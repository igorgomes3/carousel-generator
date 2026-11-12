"use client";

/**
 * Tela de login do carrossel.
 *
 * Mesmo login do painel do AutoClinic (GoTrue): uma conta, dois produtos. O
 * texto diz isso explicitamente para ninguém procurar "senha do carrossel".
 */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { entrar } from "@/lib/auth/sessao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const destino = params.get("de") || "/";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    try {
      await entrar(email, senha);
      router.replace(destino);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Carrossel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Entre com a mesma conta do painel do AutoClinic.
          </p>
        </div>

        <form onSubmit={enviar} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          {erro && (
            <p className="text-sm rounded-lg bg-destructive/10 text-destructive px-3 py-2">{erro}</p>
          )}

          <Button type="submit" className="w-full" disabled={entrando}>
            {entrando ? "Entrando…" : "Entrar"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Esqueceu a senha? Peça a quem administra a plataforma para emitir uma senha temporária —
            o e-mail de recuperação ainda não está configurado.
          </p>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-4">
          <Link href="/p" className="underline">
            Ver um carrossel por link público
          </Link>
        </p>
      </div>
    </main>
  );
}
