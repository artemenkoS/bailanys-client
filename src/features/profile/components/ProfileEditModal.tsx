import { Modal } from '@mantine/core';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../hooks/useProfile';
import { ProfileEditForm } from './ProfileEditForm';

interface ProfileEditModalProps {
  opened: boolean;
  onClose: () => void;
}

export const ProfileEditModal = ({ opened, onClose }: ProfileEditModalProps) => {
  const { profile } = useProfile();
  const { t } = useTranslation();

  const profileKey = useMemo(
    () =>
      [profile?.id ?? '', profile?.username ?? '', profile?.display_name ?? '', profile?.avatar_url ?? ''].join('|'),
    [profile?.id, profile?.username, profile?.display_name, profile?.avatar_url]
  );

  return (
    <Modal opened={opened} onClose={onClose} title={t('profile.editTitle')} centered>
      {opened && <ProfileEditForm key={profileKey} onClose={onClose} />}
    </Modal>
  );
};
