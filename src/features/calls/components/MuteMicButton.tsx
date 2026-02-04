import { ActionIcon } from "@mantine/core";
import { IconMicrophone, IconMicrophoneOff } from "@tabler/icons-react";

interface MuteMicButtonProps {
  isMuted: boolean;
  onToggle: () => void;
}

export const MuteMicButton = ({ isMuted, onToggle }: MuteMicButtonProps) => (
  <ActionIcon
    color={isMuted ? "yellow" : "gray"}
    size="xl"
    radius="md"
    variant={isMuted ? "filled" : "light"}
    onClick={onToggle}
    title={isMuted ? "Unmute microphone" : "Mute microphone"}
    style={{ transition: "transform 0.2s ease" }}
  >
    {isMuted ? <IconMicrophoneOff size={20} /> : <IconMicrophone size={20} />}
  </ActionIcon>
);
