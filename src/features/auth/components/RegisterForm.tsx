import { Button, Flex, TextInput, Typography, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export const RegisterForm = () => {
  const { register, isRegistering, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },

    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      username: (value) =>
        value.length < 4 ? "Username must be at least 4 characters" : null,
      password: (value) =>
        value.length < 6 ? "Password must be at least 6 characters" : null,
      confirmPassword: (value, values) =>
        value !== values.password ? "Passwords do not match" : null,
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = form.onSubmit((values) => {
    register({
      email: values.email,
      username: values.username,
      password: values.password,
      displayName: values.username,
    });
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
            Register
          </Typography>

          <TextInput
            withAsterisk
            label="Email"
            placeholder="your@email.com"
            {...form.getInputProps("email")}
          />

          <TextInput
            withAsterisk
            label="Username"
            placeholder="username"
            {...form.getInputProps("username")}
          />

          <TextInput
            withAsterisk
            label="Password"
            type="password"
            placeholder="••••••••"
            {...form.getInputProps("password")}
          />

          <TextInput
            withAsterisk
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            {...form.getInputProps("confirmPassword")}
          />

          <Button type="submit" fullWidth loading={isRegistering} mt="md">
            Register
          </Button>

          <Button variant="subtle" fullWidth onClick={() => navigate("/login")}>
            Already have an account? Login
          </Button>
        </Stack>
      </form>
    </Flex>
  );
};
