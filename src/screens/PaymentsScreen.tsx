import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../data';
import {
  dstr,
  filterPayments,
  fmt,
  pageSlice,
  pendingInvitations,
  relativeInvLabel,
  searchFilter,
  today,
  Invitation,
  Txn,
} from '../lib';
import { C } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Avatar, Btn, Card, Empty, listCardWrap, Row, SearchInput, SecTitle, StatusChip, Txt } from '../components/UI';
import { SearchableList } from '../components/SearchableList';
import { PayHandsIcon, PlusIcon, TrashIcon } from '../components/Icons';
import { Sheet } from '../components/Sheet';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { PersonPickerSheet } from '../sheets/PersonPickerSheet';
import { PersonFormSheet } from '../sheets/PersonFormSheet';
import { EntrySheet, EntryCtx } from '../sheets/EntrySheet';
import { InvitationSheet } from '../sheets/InvitationSheet';
import { confirmSheet } from '../components/ConfirmSheet';
import { toast } from '../components/Toast';
import { getPermissionGranted, notificationsSupported, requestPermission } from '../notifications';
import type { RootNav } from '../nav';

type PaymentItem = Txn & { name: string };

const INV_LIMIT = 10;
const INV_PAGE = 25;

/* Payments tab: invitations to others' payatts + everything I gave (dir='out'). */
export function PaymentsScreen() {
  const nav = useNavigation<RootNav>();
  const { t, tp, lang, people, txns, invitations, meta, removeTxn, addInvitation, closeInv, setMeta } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  /* "Pay a payat" chain: picker → amount sheet (or new-person → amount sheet) */
  const [pickOpen, setPickOpen] = useState(false);
  const [newPersonOpen, setNewPersonOpen] = useState(false);
  const [entryCtx, setEntryCtx] = useState<EntryCtx | null>(null);
  /* invitation flows */
  const [invPickOpen, setInvPickOpen] = useState(false);
  const [invNewPersonOpen, setInvNewPersonOpen] = useState(false);
  const [invHostId, setInvHostId] = useState<number | null>(null);
  const [invActionFor, setInvActionFor] = useState<Invitation | null>(null);
  const [pendingSave, setPendingSave] = useState<{ hostId: number; date: string; note: string } | null>(null);
  const [payLinkInvId, setPayLinkInvId] = useState<number | null>(null);
  const [invQ, setInvQ] = useState('');
  const [invShown, setInvShown] = useState(INV_LIMIT);
  const [permGranted, setPermGranted] = useState(true);

  useEffect(() => setInvShown(INV_LIMIT), [invQ]);
  useEffect(() => {
    if (notificationsSupported) getPermissionGranted().then(setPermGranted);
  }, []);

  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  const allPayments: PaymentItem[] = filterPayments(txns, people, '').map((x) => ({
    ...x,
    name: nameOf.get(x.personId) ?? '',
  }));
  const recent = allPayments.slice(0, 5);

  const pending = pendingInvitations(invitations).map((i) => ({ ...i, name: nameOf.get(i.hostId) ?? '' }));
  const invPage = pageSlice(searchFilter(pending, invQ, ['name', 'note']), invShown);

  const saveInvitation = async (hostId: number, date: string, note: string) => {
    await addInvitation(hostId, date, note);
    toast(t('tSaved'));
    if (notificationsSupported) getPermissionGranted().then(setPermGranted);
  };

  /* First save: themed explain sheet → OS permission → save. */
  const onInvFormSave = async (date: string, note: string) => {
    const hostId = invHostId!;
    setInvHostId(null);
    if (notificationsSupported && !permGranted && meta.notifAsked !== '1') {
      setPendingSave({ hostId, date, note });
      return;
    }
    await saveInvitation(hostId, date, note);
  };

  const finishExplain = async (allow: boolean) => {
    const p = pendingSave;
    setPendingSave(null);
    await setMeta('notifAsked', '1');
    if (allow) {
      const granted = await requestPermission();
      setPermGranted(granted);
    }
    if (p) await saveInvitation(p.hostId, p.date, p.note);
  };

  const invChip = (inv: Invitation) => {
    const rel = relativeInvLabel(inv.date, today());
    if (rel.kind === 'overdue') return <StatusChip kind="neg" label={tp('daysAgo', { d: rel.d })} />;
    if (rel.kind === 'today') return <StatusChip kind="gold" label={t('today')} />;
    if (rel.kind === 'tomorrow') return <StatusChip kind="gold" label={t('tomorrow')} />;
    return <StatusChip kind="gold" label={tp('daysLeft', { d: rel.d })} />;
  };

  const delTxn = async (id: number) => {
    if (!(await confirmSheet({ message: t('qDelEntry'), destructive: true }))) return;
    await removeTxn(id);
    toast(t('tDeleted'));
  };

  const markPaid = async (inv: Invitation) => {
    setInvActionFor(null);
    if (!(await confirmSheet({ message: t('qMarkPaid'), confirmLabel: t('markPaid'), destructive: false }))) return;
    await closeInv(inv.id, 'paid');
    toast(t('tSaved'));
  };

  const removeInv = async (inv: Invitation) => {
    setInvActionFor(null);
    if (!(await confirmSheet({ message: t('qRemoveInv'), destructive: true }))) return;
    await closeInv(inv.id, 'removed');
    toast(t('tDeleted'));
  };

  const paymentRow = (x: PaymentItem, index: number, count: number, deletable: boolean) => (
    <Row last={index === count - 1} onPress={() => nav.navigate('Person', { id: x.personId })}>
      <Avatar name={x.name || '?'} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt w={700} size={16.5} color={C.green} num numberOfLines={1}>
          {tp('recentOut', { n: x.name, a: fmt(x.amount) })}
        </Txt>
        <Txt size={13.5} color={C.inkSoft} numberOfLines={1}>
          {dstr(x.date, lang)}
          {x.note ? ` · ${x.note}` : ''}
        </Txt>
      </View>
      {deletable ? (
        <Pressable
          onPress={() => delTxn(x.id)}
          accessibilityLabel="Delete"
          style={({ pressed }) => [st.mini, pressed && { backgroundColor: C.cotton }]}
        >
          <TrashIcon />
        </Pressable>
      ) : null}
    </Row>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.cotton }}>
      <KasavuHeader onGear={() => setSettingsOpen(true)} />
      <SearchableList
        data={allPayments}
        keyOf={(x) => String(x.id)}
        searchKeys={['name', 'note']}
        placeholder={t('searchPayments')}
        contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: 96 }}
        empty={<Empty title={t('emptyPayT')} desc={t('emptyPayD')} />}
        header={
          <View>
            <Btn
              label={t('payBtn')}
              kind="gold"
              icon={<PayHandsIcon color={C.greenDeep} />}
              onPress={() => setPickOpen(true)}
              style={{ marginTop: 0 }}
            />

            {/* invitations */}
            <SecTitle>{t('invitations')}</SecTitle>
            <Btn
              label={t('addInvitation')}
              kind="ghost"
              icon={<PlusIcon color={C.greenDeep} />}
              onPress={() => setInvPickOpen(true)}
              style={{ marginTop: 0, marginBottom: pending.length ? 10 : 0 }}
            />
            {pending.length > INV_LIMIT ? (
              <View style={{ marginBottom: 10 }}>
                <SearchInput value={invQ} onChangeText={setInvQ} placeholder={t('searchName')} autoCorrect={false} />
              </View>
            ) : null}
            {invPage.rows.length ? (
              <Card>
                {invPage.rows.map((inv, i) => (
                  <Row key={inv.id} last={i === invPage.rows.length - 1} onPress={() => setInvActionFor(inv)}>
                    <Avatar name={inv.name || '?'} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt w={600} size={16.5} numberOfLines={1}>
                        {inv.name}
                      </Txt>
                      <Txt size={13.5} color={C.inkSoft} numberOfLines={1}>
                        {dstr(inv.date, lang)}
                        {inv.note ? ` · ${inv.note}` : ''}
                      </Txt>
                    </View>
                    {invChip(inv)}
                  </Row>
                ))}
              </Card>
            ) : invQ.trim() && pending.length ? (
              <Card>
                <Empty desc={t('noMatch')} />
              </Card>
            ) : null}
            {invPage.hasMore ? (
              <Btn label={t('showMore')} kind="ghost" onPress={() => setInvShown((s) => s + INV_PAGE)} />
            ) : null}
            {pending.length && Platform.OS === 'web' ? (
              <Txt size={13.5} color={C.inkSoft} style={{ marginTop: 8 }}>
                {t('notifWebHint')}
              </Txt>
            ) : null}
            {pending.length && notificationsSupported && !permGranted ? (
              <Txt size={13.5} color={C.inkSoft} style={{ marginTop: 8 }}>
                {t('notifOff')}
              </Txt>
            ) : null}

            <SecTitle>{t('recentPayments')}</SecTitle>
            <Card>
              {recent.length ? (
                recent.map((x, i) => (
                  <React.Fragment key={x.id}>{paymentRow(x, i, recent.length, false)}</React.Fragment>
                ))
              ) : (
                <Empty title={t('emptyPayT')} desc={t('emptyPayD')} />
              )}
            </Card>
            <SecTitle>{t('allPayments')}</SecTitle>
          </View>
        }
        renderRow={(item, index, count) => paymentRow(item, index, count, true)}
      />

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* pay chain */}
      <PersonPickerSheet
        visible={pickOpen}
        title={t('whoPay')}
        onClose={() => setPickOpen(false)}
        onPick={(id) => {
          setPickOpen(false);
          setEntryCtx({ personId: id, dir: 'out' });
        }}
        onNew={() => {
          setPickOpen(false);
          setNewPersonOpen(true);
        }}
      />
      <PersonFormSheet
        visible={newPersonOpen}
        onClose={() => setNewPersonOpen(false)}
        quiet
        onSaved={(id) => setEntryCtx({ personId: id, dir: 'out' })}
      />
      <EntrySheet
        ctx={entryCtx}
        onClose={() => {
          setEntryCtx(null);
          setPayLinkInvId(null);
        }}
        onSaved={async (txnId) => {
          if (payLinkInvId != null) {
            await closeInv(payLinkInvId, 'paid', txnId);
            setPayLinkInvId(null);
          }
        }}
      />

      {/* invitation chain: host picker → (new person) → date/note sheet */}
      <PersonPickerSheet
        visible={invPickOpen}
        title={t('invHost')}
        onClose={() => setInvPickOpen(false)}
        onPick={(id) => {
          setInvPickOpen(false);
          setInvHostId(id);
        }}
        onNew={() => {
          setInvPickOpen(false);
          setInvNewPersonOpen(true);
        }}
      />
      <PersonFormSheet
        visible={invNewPersonOpen}
        onClose={() => setInvNewPersonOpen(false)}
        quiet
        onSaved={(id) => setInvHostId(id)}
      />
      <InvitationSheet
        host={invHostId != null ? (people.find((p) => p.id === invHostId) ?? null) : null}
        onClose={() => setInvHostId(null)}
        onSave={onInvFormSave}
      />

      {/* first-save notification explainer */}
      <Sheet visible={!!pendingSave} onClose={() => finishExplain(false)} title={t('invitations')}>
        <Txt size={15.5} color={C.inkSoft} style={{ marginBottom: 4 }}>
          {t('notifExplain')}
        </Txt>
        <Btn label="OK" onPress={() => finishExplain(true)} />
      </Sheet>

      {/* invitation action sheet */}
      <Sheet
        visible={!!invActionFor}
        onClose={() => setInvActionFor(null)}
        title={
          invActionFor ? `${nameOf.get(invActionFor.hostId) ?? ''} · ${dstr(invActionFor.date, lang)}` : undefined
        }
      >
        {invActionFor ? (
          <View>
            <Btn
              label={t('payNow')}
              onPress={() => {
                const inv = invActionFor;
                setInvActionFor(null);
                setPayLinkInvId(inv.id);
                setEntryCtx({ personId: inv.hostId, dir: 'out' });
              }}
            />
            <Btn label={t('markPaid')} kind="gold" onPress={() => markPaid(invActionFor)} />
            <Btn label={t('qDelete')} kind="danger" onPress={() => removeInv(invActionFor)} />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const st = StyleSheet.create({
  mini: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
