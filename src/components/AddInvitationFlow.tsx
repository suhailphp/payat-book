import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useData } from '../data';
import { Sheet } from './Sheet';
import { Btn, Txt } from './UI';
import { C } from '../theme';
import { toast } from './Toast';
import { PersonPickerSheet } from '../sheets/PersonPickerSheet';
import { PersonFormSheet } from '../sheets/PersonFormSheet';
import { InvitationSheet } from '../sheets/InvitationSheet';
import { getPermissionGranted, notificationsSupported, requestPermission } from '../notifications';

/* The whole "Add invitation" chain as one reusable unit (dashboard +
   Payments tab): host picker → optional inline new person → date/note
   sheet → first-time notification explainer → save (scheduling included
   in data.addInvitation). */
export function AddInvitationFlow({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const { t, people, meta, setMeta, addInvitation } = useData();
  const [pickOpen, setPickOpen] = useState(false);
  const [newPersonOpen, setNewPersonOpen] = useState(false);
  const [hostId, setHostId] = useState<number | null>(null);
  const [pendingSave, setPendingSave] = useState<{ hostId: number; date: string; note: string } | null>(null);

  useEffect(() => {
    if (open) setPickOpen(true);
  }, [open]);

  const finish = () => {
    setPickOpen(false);
    setNewPersonOpen(false);
    setHostId(null);
    setPendingSave(null);
    onClose();
  };

  const save = async (hostIdToSave: number, date: string, note: string) => {
    await addInvitation(hostIdToSave, date, note);
    toast(t('tSaved'));
    finish();
    onDone?.();
  };

  const onFormSave = async (date: string, note: string) => {
    const id = hostId!;
    setHostId(null);
    if (notificationsSupported && meta.notifAsked !== '1' && !(await getPermissionGranted())) {
      setPendingSave({ hostId: id, date, note });
      return;
    }
    await save(id, date, note);
  };

  const finishExplain = async (allow: boolean) => {
    const p = pendingSave;
    setPendingSave(null);
    await setMeta('notifAsked', '1');
    if (allow) await requestPermission();
    if (p) await save(p.hostId, p.date, p.note);
  };

  return (
    <>
      <PersonPickerSheet
        visible={pickOpen}
        title={t('invHost')}
        onClose={finish}
        onPick={(id) => {
          setPickOpen(false);
          setHostId(id);
        }}
        onNew={() => {
          setPickOpen(false);
          setNewPersonOpen(true);
        }}
      />
      <PersonFormSheet
        visible={newPersonOpen}
        onClose={() => {
          setNewPersonOpen(false);
          finish();
        }}
        quiet
        onSaved={(id) => {
          setNewPersonOpen(false);
          setHostId(id);
        }}
      />
      <InvitationSheet
        host={hostId != null ? (people.find((p) => p.id === hostId) ?? null) : null}
        onClose={finish}
        onSave={onFormSave}
      />
      {/* first-save notification explainer */}
      <Sheet visible={!!pendingSave} onClose={() => finishExplain(false)} title={t('invitations')}>
        <View>
          <Txt size={15.5} color={C.inkSoft} style={{ marginBottom: 4 }}>
            {t('notifExplain')}
          </Txt>
          <Btn label="OK" onPress={() => finishExplain(true)} />
        </View>
      </Sheet>
    </>
  );
}
