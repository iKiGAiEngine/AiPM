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
import { authService } from "@/lib/auth";
import { AlertCircle, Building2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError("");

    try {
      await authService.login(data.email, "password"); // Using default password since we're removing password requirement
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

        {/* Demo Credentials */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Demo Login - Just Enter Email</h3>
          <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
            <div>Admin: admin@metro-construction.com</div>
            <div>PM: pm@metro-construction.com</div>
            <div>Purchaser: purchaser@metro-construction.com</div>
            <div>Field: field@metro-construction.com</div>
            <div>AP: ap@metro-construction.com</div>
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
