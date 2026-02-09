import {
  Container,
  Stack,
  Title,
  SimpleGrid,
  Center,
  Loader,
  Text,
  rem,
} from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import { ContactCard } from "./ContactCard";
import { useTranslation } from "react-i18next";
import { useOnlineUsers } from "../hooks/useOnlineUsers";

interface ContactListProps {
  onStartCall: (targetId: string, type: "audio" | "video") => void;
}

export const ContactList = ({ onStartCall }: ContactListProps) => {
  const { data, isLoading, isError } = useOnlineUsers();
  const { t } = useTranslation();
  return (
    <Container size="xl" px={{ base: "xs", sm: "md" }}>
      <Stack gap="xl" mt="md">
        <Title order={2} fw={800} style={{ fontSize: rem(24) }}>
          {t("contacts.title")}
        </Title>

        {isLoading ? (
          <Center h={200}>
            <Loader color="indigo" />
          </Center>
        ) : isError ? (
          <Center h={200}>
            <Text c="red" fw={500}>
              {t("contacts.connectionError")}
            </Text>
          </Center>
        ) : data && data.users.length > 0 ? (
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="md">
            {data.users.map((u) => (
              <ContactCard key={u.id} user={u} onStartCall={onStartCall} />
            ))}
          </SimpleGrid>
        ) : (
          <Center h={300}>
            <Stack align="center" gap="xs">
              <IconUsers size={48} color="var(--mantine-color-gray-4)" />
              <Text c="dimmed">{t("contacts.empty")}</Text>
            </Stack>
          </Center>
        )}
      </Stack>
    </Container>
  );
};
