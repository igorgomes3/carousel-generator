"use client";

/**
 * Tela de login do carrossel.
 *
 * O auth é o do **projeto Supabase do próprio carrossel** (W97): o AutoClinic
 * saiu do caminho, então o texto não pode mais prometer "a mesma conta do
 * painel". Quem tem conta aqui é quem foi criado neste projeto.
 */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { entrar, destinoSeguro } from "@/lib/auth/sessao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  // `de` vem da URL: só caminho interno (ver `destinoSeguro`). Sem isso, um link
  // /login?de=//outro-site levaria a pessoa recém-logada para fora do produto.
  const destino = destinoSeguro(params.get("de"));
  // Dois motivos para a pessoa estar aqui de novo, cada um com sua frase: sessão
  // que venceu no meio do trabalho, e saída pedida por ela mesma.
  const expirou = params.get("expirado") === "1";
  const saiu = params.get("saiu") === "1";

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
      router.refresh();
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
            Entre com a sua conta. A geração de texto e imagem consome IA paga, por isso ela
            só funciona logado.
          </p>
        </div>

        {/* Estado explicado, não silêncio: quem foi deslogado no meio do trabalho
            precisa entender por que a tela voltou para cá. */}
        {expirou && !erro ? (
          <p
            role="status"
            className="mb-4 rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: "#FFFBEB", borderColor: "#FCD34D", color: "#92400E" }}
          >
            Sua sessão expirou. Entre de novo para continuar
            {destino !== "/" ? " de onde parou" : ""} — o que você já tinha salvo continua lá.
          </p>
        ) : null}
        {saiu && !erro ? (
          <p
            role="status"
            className="mb-4 rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: "#F0FDF4", borderColor: "#BBF7D0", color: "#166534" }}
          >
            Você saiu da sua conta. Pode fechar esta aba com segurança.
          </p>
        ) : null}

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
