import React, { useState, useEffect, createContext, useContext } from "https://esm.sh/react@18.3.1";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const savedUser = localStorage.getItem("authUser");
    if (token) {
      // Validate token by making a request
      fetch("/api/entries", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(response => {
          if (response.ok) {
            setUser(savedUser ? JSON.parse(savedUser) : JSON.parse(atob(token.split(".")[1])));
          } else {
            localStorage.removeItem("authToken");
            localStorage.removeItem("authUser");
          }
        })
        .catch(() => {
          localStorage.removeItem("authToken");
          localStorage.removeItem("authUser");
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.errors?.join(" ") || "Login failed");
    }

    localStorage.setItem("authToken", data.token);
    localStorage.setItem("authUser", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password, age) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, age })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.errors?.join(" ") || "Registration failed");
    }

    localStorage.setItem("authToken", data.token);
    localStorage.setItem("authUser", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setUser(null);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    getAuthHeaders
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const LoginForm = ({ onSwitchToRegister, onSuccess }) => {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field) => (event) => {
    setForm(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(form.email, form.password);
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return React.createElement(
    "form",
    { className: "auth-form", onSubmit: handleSubmit },
    React.createElement("h2", null, "Sign In"),
    React.createElement(
      "div",
      { className: "form-group" },
      React.createElement("label", null, "Email"),
      React.createElement("input", {
        type: "email",
        value: form.email,
        onChange: updateField("email"),
        required: true,
        placeholder: "your@email.com"
      })
    ),
    React.createElement(
      "div",
      { className: "form-group" },
      React.createElement("label", null, "Password"),
      React.createElement("input", {
        type: "password",
        value: form.password,
        onChange: updateField("password"),
        required: true,
        placeholder: "Your password"
      })
    ),
    error && React.createElement("p", { className: "error" }, error),
    React.createElement(
      "button",
      { type: "submit", disabled: isLoading },
      isLoading ? "Signing in..." : "Sign In"
    ),
    React.createElement(
      "p",
      { className: "auth-switch" },
      "Don't have an account? ",
      React.createElement("button", { type: "button", className: "link-button", onClick: onSwitchToRegister }, "Sign up")
    )
  );
};

export const RegisterForm = ({ onSwitchToLogin, onSuccess }) => {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", age: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field) => (event) => {
    setForm(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 13 || age > 120) {
      setError("Age must be a whole number between 13 and 120");
      return;
    }

    setIsLoading(true);

    try {
      await register(form.name, form.email, form.password, age);
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return React.createElement(
    "form",
    { className: "auth-form", onSubmit: handleSubmit },
    React.createElement("h2", null, "Create Account"),
    React.createElement(
      "div",
      { className: "form-group" },
      React.createElement("label", null, "Name"),
      React.createElement("input", {
        type: "text",
        value: form.name,
        onChange: updateField("name"),
        required: true,
        placeholder: "Your full name"
      })
    ),
    React.createElement(
      "div",
      { className: "form-group" },
      React.createElement("label", null, "Email"),
      React.createElement("input", {
        type: "email",
        value: form.email,
        onChange: updateField("email"),
        required: true,
        placeholder: "your@email.com"
      })
    ),
    React.createElement(
      "div",
      { className: "form-group" },
      React.createElement("label", null, "Age"),
      React.createElement("input", {
        type: "number",
        min: "13",
        max: "120",
        value: form.age,
        onChange: updateField("age"),
        required: true,
        placeholder: "Your age"
      })
    ),
    React.createElement(
      "div",
      { className: "form-group" },
      React.createElement("label", null, "Password"),
      React.createElement("input", {
        type: "password",
        value: form.password,
        onChange: updateField("password"),
        required: true,
        placeholder: "At least 6 characters"
      })
    ),
    React.createElement(
      "div",
      { className: "form-group" },
      React.createElement("label", null, "Confirm Password"),
      React.createElement("input", {
        type: "password",
        value: form.confirmPassword,
        onChange: updateField("confirmPassword"),
        required: true,
        placeholder: "Repeat your password"
      })
    ),
    error && React.createElement("p", { className: "error" }, error),
    React.createElement(
      "button",
      { type: "submit", disabled: isLoading },
      isLoading ? "Creating account..." : "Create Account"
    ),
    React.createElement(
      "p",
      { className: "auth-switch" },
      "Already have an account? ",
      React.createElement("button", { type: "button", className: "link-button", onClick: onSwitchToLogin }, "Sign in")
    )
  );
};

export const AuthPage = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);

  return React.createElement(
    "div",
    { className: "auth-page" },
    React.createElement(
      "div",
      { className: "auth-container" },
      React.createElement(
        "div",
        { className: "auth-header" },
        React.createElement("h1", null, "VitalRoad"),
        React.createElement("p", null, "Track your health journey")
      ),
      isLogin
        ? React.createElement(LoginForm, {
            onSwitchToRegister: () => setIsLogin(false),
            onSuccess: onAuthSuccess
          })
        : React.createElement(RegisterForm, {
            onSwitchToLogin: () => setIsLogin(true),
            onSuccess: onAuthSuccess
          })
    )
  );
};
