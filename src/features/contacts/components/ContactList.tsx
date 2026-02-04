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
import type { Profile } from "../../../types/auth";

interface ContactListProps {
  users: Profile[] | null;
  isLoading: boolean;
  isError: boolean;
  onStartCall: (targetId: string, type: "audio" | "video") => void;
}

export const ContactList = ({
  users,
  isLoading,
  isError,
  onStartCall,
}: ContactListProps) => {
  return (
    <Container size="xl" px={{ base: "xs", sm: "md" }}>
      <Stack gap="xl" mt="md">
        <Title order={2} fw={800} style={{ fontSize: rem(24) }}>
          Contacts
        </Title>

        {isLoading ? (
          <Center h={200}>
            <Loader color="indigo" />
          </Center>
        ) : isError ? (
          <Center h={200}>
            <Text c="red" fw={500}>
              Connection error. Please try again later.
            </Text>
          </Center>
        ) : users && users.length > 0 ? (
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="md">
            {users.map((u) => (
              <ContactCard key={u.id} user={u} onStartCall={onStartCall} />
            ))}
          </SimpleGrid>
        ) : (
          <Center h={300}>
            <Stack align="center" gap="xs">
              <IconUsers size={48} color="var(--mantine-color-gray-4)" />
              <Text c="dimmed">No one else is online right now.</Text>
            </Stack>
          </Center>
        )}
      </Stack>
    </Container>
  );
};
