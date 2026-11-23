"use client";

/**
 * `/esqueci-senha` — pedir o link de redefinição por e-mail.
 *
 * O que a tela NÃO faz: dizer se o e-mail existe. O GoTrue responde igual para
 * conta e para endereço desconhecido, e repetir isso é o que impede a página de
 * virar um oráculo de "quais e-mails têm conta aqui".
 *
 * O que ela faz: avisar antes de o limite morder. O projeto novo não tem SMTP
 * próprio, então o envio sai pelo serviço do Supabase, limitado a **2 e-mails por
 * hora**; o BFF devolve 429 quando estoura e aqui vira frase de gente em vez de
 * "erro 429".
 */
import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const dados = (await res.json().catch(() => ({}))) as { erro?: string; aviso?: string };
      if (!res.ok) {
        setErro(dados.erro ?? "Não foi possível enviar o e-mail agora.");
        return;
      }
      setAviso(dados.aviso ?? "Se este e-mail tiver conta, o link chega em instantes.");
    } catch {
      setErro("Não foi possível enviar o e-mail agora. Tente de novo em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Redefinir senha</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Digite o e-mail da sua conta e enviamos um link para você escolher uma senha nova.
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

          {erro && (
            <p
              role="alert"
              className="text-sm rounded-lg bg-destructive/10 text-destructive px-3 py-2"
            >
              {erro}
            </p>
          )}
          {aviso && (
            <p
              role="status"
              className="text-sm rounded-lg border px-3 py-2"
              style={{ backgroundColor: "#F0FDF4", borderColor: "#BBF7D0", color: "#166534" }}
            >
              {aviso}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar link de redefinição"}
          </Button>

          <p className="text-xs text-muted-foreground">
            O link vale por 1 hora. Se não chegar em alguns minutos, confira o spam — o envio
            sai por um serviço de e-mail com limite de 2 mensagens por hora.
          </p>

          <p className="text-xs text-muted-foreground">
            <Link href="/login" className="underline font-medium">
              Voltar para o login
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
