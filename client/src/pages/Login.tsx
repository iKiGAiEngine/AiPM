import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, Building2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("admin");

  // Demo user credentials for different roles
  const demoUsers = {
    admin: { email: "admin@metro-construction.com", password: "admin123", role: "Admin", name: "Sarah Admin" },
    pm: { email: "pm@metro-construction.com", password: "pm123", role: "PM", name: "Mike PM" },
    purchaser: { email: "purchaser@metro-construction.com", password: "purchaser123", role: "Purchaser", name: "Lisa Purchaser" },
    field: { email: "field@metro-construction.com", password: "field123", role: "Field", name: "Tom Field" },
    ap: { email: "ap@metro-construction.com", password: "ap123", role: "AP", name: "Jennifer AP" }
  };

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: demoUsers.admin.email,
      password: demoUsers.admin.password,
    },
  });

  const handleRoleSelect = (roleKey: string) => {
    setSelectedRole(roleKey);
    const user = demoUsers[roleKey as keyof typeof demoUsers];
    form.setValue("email", user.email);
    form.setValue("password", user.password);
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError("");

    try {
      await login(data.email, data.password);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      navigate("/dashboard");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Brand */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-foreground">BuildProcure AI</h1>
          <p className="mt-2 text-muted-foreground">Construction Materials Procurement Platform</p>
        </div>

        {/* User Role Selection */}
        <Card className="border-primary/20">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg text-primary">Select User Role</CardTitle>
            <p className="text-sm text-muted-foreground">Choose a role to test different permissions</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(demoUsers).map(([key, user]) => (
              <Button
                key={key}
                type="button"
                variant={selectedRole === key ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => handleRoleSelect(key)}
                data-testid={`button-select-${key}`}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold">{user.role}</span>
                  <span className="text-xs text-muted-foreground">{user.name}</span>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Pre-loaded Demo Login</h3>
          <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
            <div>Selected: <strong>{demoUsers[selectedRole as keyof typeof demoUsers].role}</strong> role</div>
            <div>Credentials are pre-filled. Click "Sign In" to continue.</div>
          </div>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  {...form.register("email")}
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                  data-testid="input-email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  {...form.register("password")}
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  data-testid="input-password"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2024 BuildProcure AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
