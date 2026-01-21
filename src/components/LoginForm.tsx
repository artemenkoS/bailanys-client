import { Button, Flex, TextInput, Typography, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";

import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export const LoginForm = () => {
  const { login, isLoggingIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },

    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) =>
        value.length < 6 ? "Password must be at least 6 characters" : null,
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = form.onSubmit((values) => {
    login(values);
  });

  return (
    <Flex
      direction="column"
      gap="lg"
      align="center"
      justify="center"
      style={{ width: "100vw", margin: "auto", height: "100vh" }}
    >
      <form onSubmit={handleSubmit} style={{ width: 350 }}>
        <Stack gap="md">
          <Typography variant="h4" style={{ marginBottom: 16 }}>
            Login
          </Typography>

          <TextInput
            withAsterisk
            label="Email"
            placeholder="your@email.com"
            {...form.getInputProps("email")}
          />

          <TextInput
            withAsterisk
            label="Password"
            type="password"
            placeholder="••••••••"
            {...form.getInputProps("password")}
          />

          <Button type="submit" fullWidth loading={isLoggingIn} mt="md">
            Login
          </Button>

          <Button
            variant="subtle"
            fullWidth
            onClick={() => navigate("/register")}
          >
            Don't have an account? Register
          </Button>
        </Stack>
      </form>
    </Flex>
  );
};
