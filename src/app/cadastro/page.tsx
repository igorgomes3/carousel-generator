"use client";

/**
 * `/cadastro` — criar conta e entrar, sem administrador no meio.
 *
 * Por que é uma página e não um estado do login: o formulário tem um campo a
 * mais (confirmar a senha) e um efeito diferente (cria a conta). Misturar os dois
 * num toggle esconde o que vai acontecer quando a pessoa clica.
 *
 * O que pode dar errado, e o que a tela faz:
 *   - e-mail já cadastrado → 409 do BFF, frase que manda para "Entrar" ou para a
 *     redefinição, sem culpar a pessoa;
 *   - projeto exigindo confirmação de e-mail (alguém desligou o autoconfirm no
 *     dashboard) → a conta é criada, mas a resposta diz que falta confirmar em
 *     vez de fingir um login;
 *   - limite de envio de e-mail do provedor → 429, com a frase certa.
 */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { aplicarSessao, carregarUsuario, destinoSeguro } from "@/lib/auth/sessao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CadastroPage() {
  const router = useRouter();
  const params = useSearchParams();
  const destino = destinoSeguro(params.get("de"));

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);

    if (senha.length < 6) {
      setErro("A senha precisa ter 6 caracteres ou mais.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const dados = (await res.json().catch(() => ({}))) as {
        erro?: string;
        aviso?: string;
        access_token?: string;
        refresh_token?: string;
        precisa_confirmar?: boolean;
      };

      if (!res.ok) {
        setErro(dados.erro ?? "Não foi possível criar a conta agora.");
        return;
      }

      if (dados.precisa_confirmar || !dados.access_token || !dados.refresh_token) {
        setAviso(
          dados.aviso ??
            "Conta criada. Falta confirmar o e-mail: abra o link que enviamos para a sua caixa de entrada.",
        );
        return;
      }

      // Autoconfirm ligado no projeto: a conta já nasce com sessão e a pessoa
      // cai direto no estúdio, que é o que "criar conta" promete.
      aplicarSessao(dados.access_token, dados.refresh_token);
      await carregarUsuario();
      router.replace(destino);
      router.refresh();
    } catch {
      setErro("Não foi possível criar a conta agora. Tente de novo em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Leva um minuto. Depois de criar, você já pode gerar e salvar seus carrosséis.
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
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={6}
              required
            />
            <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmacao">Repita a senha</Label>
            <Input
              id="confirmacao"
              type="password"
              autoComplete="new-password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {erro && (
            <p role="alert" className="text-sm rounded-lg bg-destructive/10 text-destructive px-3 py-2">
              {erro}
            </p>
          )}
          {aviso && (
            <p
              role="status"
              className="text-sm rounded-lg border px-3 py-2"
              style={{ backgroundColor: "#FFFBEB", borderColor: "#FCD34D", color: "#92400E" }}
            >
              {aviso}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? "Criando conta…" : "Criar conta e entrar"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="underline font-medium">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
