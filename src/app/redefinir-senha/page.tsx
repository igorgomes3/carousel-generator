"use client";

/**
 * `/redefinir-senha` — escolher a senha nova a partir do link do e-mail.
 *
 * Como o token chega: o GoTrue redireciona para cá com
 * `#access_token=…&refresh_token=…&type=recovery`. O hash **não** é enviado ao
 * servidor em requisição nenhuma (é o navegador que lê), então o token nunca
 * aparece em log de acesso nem em `Referer`.
 *
 * Duas falhas com frases diferentes, porque a ação da pessoa é diferente:
 *   - link aberto sem token (digitou a URL, ou o cliente de e-mail cortou o hash)
 *     → oferece pedir outro link;
 *   - token recusado pelo servidor (expirado, já usado) → mesma oferta, com a
 *     explicação de que o link vale uma vez e por tempo limitado.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Estado = "lendo" | "pronto" | "sem-token" | "salvando" | "salvo" | "erro";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("lendo");
  const [token, setToken] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const access = hash.get("access_token") ?? "";
    const tipo = hash.get("type") ?? "";
    // Alguns clientes de e-mail entregam o link com `?` em vez de `#`; aceitar os
    // dois evita "link inválido" para quem só clicou.
    const busca = new URLSearchParams(window.location.search);
    const alternativo = busca.get("access_token") ?? "";

    const achado = access || alternativo;
    if (!achado) {
      setEstado("sem-token");
      return;
    }
    if (tipo && tipo !== "recovery") {
      setEstado("sem-token");
      return;
    }
    setToken(achado);
    setEstado("pronto");
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 6) {
      setErro("A senha precisa ter 6 caracteres ou mais.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setEstado("salvando");
    try {
      const res = await fetch("/api/auth/redefinir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ access_token: token, senha }),
      });
      const dados = (await res.json().catch(() => ({}))) as { erro?: string };
      if (!res.ok) {
        setErro(dados.erro ?? "Não foi possível salvar a senha nova.");
        setEstado("erro");
        return;
      }
      setEstado("salvo");
      // Sem sessão automática aqui: a pessoa entra com a senha que acabou de
      // escolher, e o login confirma que ela funciona de verdade.
      router.replace("/login?redefiniu=1");
      router.refresh();
    } catch {
      setErro("Não foi possível salvar a senha nova. Tente de novo em instantes.");
      setEstado("erro");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Escolher senha nova</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina a senha que você vai usar para entrar no carrossel.
          </p>
        </div>

        {estado === "sem-token" ? (
          <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
            <p className="text-sm">
              Este link não trouxe um código de redefinição — pode ter sido copiado pela metade
              ou já ter sido usado.
            </p>
            <Link
              href="/esqueci-senha"
              className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border px-3 text-sm font-semibold"
            >
              Pedir um novo link
            </Link>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha nova</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={6}
                required
                disabled={estado === "lendo" || estado === "salvando"}
              />
              <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmacao">Repita a senha nova</Label>
              <Input
                id="confirmacao"
                type="password"
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                minLength={6}
                required
                disabled={estado === "lendo" || estado === "salvando"}
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

            <Button
              type="submit"
              className="w-full"
              disabled={estado === "lendo" || estado === "salvando" || estado === "salvo"}
            >
              {estado === "salvando" ? "Salvando…" : "Salvar senha"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
