"use client";

/**
 * Tela de login do carrossel.
 *
 * O carrossel é um SaaS independente: a conta é criada **aqui**, no Supabase do
 * próprio carrossel. Nenhum texto desta tela pode citar outro produto nosso — o
 * cliente que chega não sabe (nem precisa saber) que existe outro sistema.
 *
 * Três portas, todas abertas e sem administrador no meio:
 *   - entrar (e-mail + senha);
 *   - criar conta (self-serve, entra direto — ver `/api/auth/cadastro`);
 *   - esqueceu a senha (link por e-mail — ver `/esqueci-senha`).
 */
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { entrar, destinoSeguro } from "@/lib/auth/sessao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();

  /**
   * Rede de segurança do link de redefinição.
   *
   * O link do e-mail traz `#access_token=…&type=recovery`. Se o provedor cair no
   * `site_url` em vez do `redirect_to` (aconteceu: a URL de destino precisa estar
   * na allow list do projeto), o hash chega aqui. Encaminhar preserva o token e a
   * pessoa continua o fluxo em vez de ver "link inválido".
   */
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const busca = window.location.search.replace(/^\?/, "");
    const doHash = new URLSearchParams(hash);
    const daBusca = new URLSearchParams(busca);

    /**
     * Link do e-mail recusado pelo provedor (expirado ou já consumido — clientes
     * como o Gmail abrem o link antes da pessoa, e o token é de uso único).
     * Antes isso caía no formulário de login sem explicação: a pessoa achava que
     * o sistema estava quebrado. Agora vai para "esqueci a senha" com o motivo.
     */
    const erro = doHash.get("error_code") ?? daBusca.get("error_code") ?? doHash.get("error");
    if (erro) {
      router.replace("/esqueci-senha?expirado=1");
      return;
    }

    if (!hash) return;
    const tipo = doHash.get("type");
    if (tipo === "recovery") router.replace(`/redefinir-senha#${hash}`);
  }, [router]);
  // `de` vem da URL: só caminho interno (ver `destinoSeguro`). Sem isso, um link
  // /login?de=//outro-site levaria a pessoa recém-logada para fora do produto.
  const destino = destinoSeguro(params.get("de"));
  // Três motivos para a pessoa estar aqui de novo, cada um com sua frase.
  const expirou = params.get("expirado") === "1";
  const saiu = params.get("saiu") === "1";
  const redefiniu = params.get("redefiniu") === "1";

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
          <h1 className="text-2xl font-semibold tracking-tight">CONTENTX</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Entre na sua conta para criar e salvar seus carrosséis.
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
        {redefiniu && !erro ? (
          <p
            role="status"
            className="mb-4 rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: "#F0FDF4", borderColor: "#BBF7D0", color: "#166534" }}
          >
            Senha alterada. Entre com a senha nova.
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
            <p
              role="alert"
              className="text-sm rounded-lg bg-destructive/10 text-destructive px-3 py-2"
            >
              {erro}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={entrando}>
            {entrando ? "Entrando…" : "Entrar"}
          </Button>

          <p className="text-xs text-muted-foreground">
            <Link href="/esqueci-senha" className="font-medium underline">
              Esqueceu a senha?
            </Link>{" "}
            Enviamos um link de redefinição para o seu e-mail.
          </p>
        </form>

        <div className="mt-4 rounded-xl border bg-card p-4 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Ainda não tem conta?</p>
          <Link
            href={`/cadastro${destino !== "/" ? `?de=${encodeURIComponent(destino)}` : ""}`}
            className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border px-3 text-sm font-semibold"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </main>
  );
}
