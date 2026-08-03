import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useData } from '../data';
import {
  dstr,
  filterPayments,
  fmt,
  pageSlice,
  pendingInvitations,
  searchFilter,
  Invitation,
  Txn,
} from '../lib';
import { C } from '../theme';
import { KasavuHeader } from '../components/Header';
import { Avatar, Btn, Card, Empty, listCardWrap, Row, SearchInput, SecTitle, Txt } from '../components/UI';
import { InvitationChip } from '../components/InvitationChip';
import { AddInvitationFlow } from '../components/AddInvitationFlow';
import { SearchableList } from '../components/SearchableList';
import { PayHandsIcon, PlusIcon } from '../components/Icons';
import { Sheet } from '../components/Sheet';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { PersonPickerSheet } from '../sheets/PersonPickerSheet';
import { PersonFormSheet } from '../sheets/PersonFormSheet';
import { EntrySheet, EntryCtx } from '../sheets/EntrySheet';
import { confirmSheet } from '../components/ConfirmSheet';
import { toast } from '../components/Toast';
import { getPermissionGranted, notificationsSupported } from '../notifications';

type PaymentItem = Txn & { name: string };

const INV_LIMIT = 10;
const INV_PAGE = 25;

/* Payments tab: invitations to others' payatts + everything I gave (dir='out'). */
export function PaymentsScreen() {
  const { t, tp, lang, people, txns, invitations, closeInv } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  /* "Pay a payat" chain: picker → amount sheet (or new-person → amount sheet) */
  const [pickOpen, setPickOpen] = useState(false);
  const [newPersonOpen, setNewPersonOpen] = useState(false);
  const [entryCtx, setEntryCtx] = useState<EntryCtx | null>(null);
  /* invitation flows */
  const [invFlowOpen, setInvFlowOpen] = useState(false);
  const [invActionFor, setInvActionFor] = useState<Invitation | null>(null);
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

  const paymentRow = (x: PaymentItem, index: number, count: number) => (
    <Row
      last={index === count - 1}
      onPress={() => setEntryCtx({ personId: x.personId, dir: x.dir, eventId: x.eventId ?? undefined, txn: x })}
    >
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
              onPress={() => setInvFlowOpen(true)}
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
                    <InvitationChip date={inv.date} />
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
                  <React.Fragment key={x.id}>{paymentRow(x, i, recent.length)}</React.Fragment>
                ))
              ) : (
                <Empty title={t('emptyPayT')} desc={t('emptyPayD')} />
              )}
            </Card>
            <SecTitle>{t('allPayments')}</SecTitle>
          </View>
        }
        renderRow={(item, index, count) => paymentRow(item, index, count)}
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

      {/* invitation add chain (shared with the dashboard) */}
      <AddInvitationFlow
        open={invFlowOpen}
        onClose={() => setInvFlowOpen(false)}
        onDone={() => {
          if (notificationsSupported) getPermissionGranted().then(setPermGranted);
        }}
      />

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
