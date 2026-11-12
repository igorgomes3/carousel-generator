"use client";

/**
 * Configurações › Marca — direção A (Neutro denso).
 *
 * Existe por uma razão só: o nome e o @ que saem no slide são dado da
 * ORGANIZAÇÃO, não constante do editor. Antes eles vinham de `defaultValues`
 * ("My name" / "@name") e iam parar na peça entregue ao cliente.
 *
 * Regras do campo @ (as mesmas que a API aplica, e a API é quem manda):
 * minúsculo, sem espaço, um único @ no começo. Validar também aqui é só para o
 * erro aparecer antes do round-trip, não para substituir a validação do servidor.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { apiJson, garantirSessao } from "@/lib/auth/sessao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MarcaConta } from "@/lib/providers/document-provider";

const ORG = "org=autoclinic";

/**
 * Mesma regra da API (`normalizarHandle` em `apps/api/src/carrossel.ts`):
 * devolve o valor pronto para gravar ou o motivo da recusa.
 */
function normalizarHandle(bruto: string): { ok: true; valor: string } | { ok: false; erro: string } {
  const limpo = bruto.trim().toLowerCase();
  if (!limpo) return { ok: true, valor: "" };
  if (/\s/.test(limpo)) return { ok: false, erro: "O @ não pode ter espaço" };
  const semArroba = limpo.replace(/^@+/, "");
  if (semArroba.includes("@")) return { ok: false, erro: "Use um único @ no começo" };
  if (!/^[a-z0-9._]{2,30}$/.test(semArroba)) {
    return {
      ok: false,
      erro: "O @ aceita letras, números, ponto e sublinhado, de 2 a 30 caracteres",
    };
  }
  return { ok: true, valor: `@${semArroba}` };
}

type Estado = "ocioso" | "salvando" | "salvo" | "erro";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [handle, setHandle] = useState("");
  const [avatar, setAvatar] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [estado, setEstado] = useState<Estado>("ocioso");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const ok = await garantirSessao();
      if (!ok) {
        router.replace("/login?de=/configuracoes");
        return;
      }
      try {
        const r = await apiJson<{ marca: MarcaConta }>(`/carrossel/marca?${ORG}`);
        if (cancelado) return;
        setNome(r.marca?.nome ?? "");
        setHandle(r.marca?.handle ?? "");
        setAvatar(r.marca?.avatar_url ?? "");
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : "Falha ao carregar a marca");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [router]);

  async function salvar(marcaNome: string | null) {
    setErro(null);
    setAviso(null);

    const normalizado = normalizarHandle(handle);
    if (!normalizado.ok) {
      setErro(normalizado.erro);
      setEstado("erro");
      return;
    }

    setEstado("salvando");
    try {
      const r = await apiJson<{ marca: MarcaConta }>(`/carrossel/marca?${ORG}`, {
        method: "POST",
        body: JSON.stringify({
          marca_nome: marcaNome,
          marca_handle: normalizado.valor,
          marca_avatar_url: avatar.trim(),
        }),
      });
      setNome(r.marca?.nome ?? "");
      setHandle(r.marca?.handle ?? "");
      setAvatar(r.marca?.avatar_url ?? "");
      setEstado("salvo");
    } catch (e) {
      setEstado("erro");
      setErro(e instanceof Error ? e.message : "Falha ao salvar a marca");
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-12 max-w-[1180px] items-center gap-3 px-4">
          <Link href="/projetos" className="text-body font-semibold tracking-[-0.01em]">
            Carrossel
          </Link>
          <span aria-hidden="true" className="text-meta text-muted-foreground">
            /
          </span>
          <span className="text-meta font-medium text-subtle">Configurações</span>
          <Link
            href="/projetos"
            className="ml-auto text-meta font-medium text-subtle hover:text-foreground"
          >
            Galeria
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[680px] px-4 py-6">
        <h1 className="text-title font-semibold tracking-[-0.01em]">Configurações</h1>
        <p className="mt-1 text-body text-muted-foreground">
          A marca é da organização: todo carrossel novo nasce com este nome e este @. Carrossel
          antigo continua mostrando a marca de quem o criou.
        </p>

        <section className="mt-6 rounded-lg border border-border bg-card p-4">
          <h2 className="text-body font-semibold">Marca da organização</h2>
          <p className="mt-1 text-meta text-muted-foreground">
            Deixe o nome vazio para não assinar o slide. Marca vazia não imprime nada.
          </p>

          {carregando ? (
            <div className="mt-4 space-y-2" aria-busy="true">
              <div className="h-9 animate-pulse rounded-md bg-secondary" />
              <div className="h-9 animate-pulse rounded-md bg-secondary" />
            </div>
          ) : (
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void salvar(nome.trim());
              }}
            >
              <div className="space-y-1.5">
                <label htmlFor="marca-nome" className="text-meta font-medium">
                  Nome no slide
                </label>
                <Input
                  id="marca-nome"
                  value={nome}
                  maxLength={60}
                  placeholder="Nome da clínica ou do perfil"
                  onChange={(e) => {
                    setNome(e.target.value);
                    setEstado("ocioso");
                  }}
                />
                <p className="text-meta text-muted-foreground">
                  É o nome que aparece na assinatura do slide.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="marca-handle" className="text-meta font-medium">
                  @ do perfil
                </label>
                <Input
                  id="marca-handle"
                  value={handle}
                  placeholder="@seuperfil"
                  autoCapitalize="none"
                  spellCheck={false}
                  onChange={(e) => {
                    setHandle(e.target.value);
                    setEstado("ocioso");
                  }}
                  onBlur={() => {
                    const normalizado = normalizarHandle(handle);
                    if (normalizado.ok) setHandle(normalizado.valor);
                  }}
                />
                <p className="text-meta text-muted-foreground">
                  Minúsculo, sem espaço e com um único @ no começo.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="marca-avatar" className="text-meta font-medium">
                  URL do avatar (opcional)
                </label>
                <Input
                  id="marca-avatar"
                  value={avatar}
                  placeholder="https://…"
                  onChange={(e) => {
                    setAvatar(e.target.value);
                    setEstado("ocioso");
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={estado === "salvando"}>
                  {estado === "salvando" ? "Salvando…" : "Salvar marca"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={estado === "salvando"}
                  onClick={() => void salvar(null)}
                >
                  Usar o nome da organização
                </Button>
                {estado === "salvo" && (
                  <span className="text-meta text-muted-foreground">Marca salva.</span>
                )}
              </div>

              {erro && (
                <p role="alert" className="text-meta text-destructive">
                  {erro}
                </p>
              )}
              {aviso && <p className="text-meta text-muted-foreground">{aviso}</p>}
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
