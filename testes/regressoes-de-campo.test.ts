/**
 * Regressoes de campo: as correcoes que nasceram como patch local no projeto piloto e foram levadas
 * ao pacote na 0.13.0. O arquivo veio de la' sem reescrita (so' o import do Vitest trocado pelo
 * adaptador local), para a pergunta "ainda prova o mesmo?" ter resposta por construcao.
 *
 * Tres mudancas, todas declaradas no lugar: dois testes que so' faziam sentido no piloto, e os
 * fixtures cujo gate de testes nao imprimia nada. No piloto isso passava como APROVADO, e era o
 * defeito (gate que existe e nao checa nada): aqui o fixture imprime o que um runner imprime.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "./vitest-local.ts";
import { MARCA_PLANO_NO_TITULO } from "../.mentor/scripts/tipos.ts";
import type { Contexto, Tarefa } from "../.mentor/scripts/tipos.ts";
import { carregarAuditorias, resolver as resolverAuditoria } from "../.mentor/scripts/cmd-auditar.ts";
import { dividirEmPartes, hashSha256, interpretarNameStatus, prepararRevisaoIncremental, registrarRevisaoIncremental, validarCaminhoContextual } from "../.mentor/scripts/revisao-incremental.ts";
import { arquivoExigeRevisao, escopoExclusivoDoMentor, fonteDoRef, fonteLocal, verificarCobertura, fingerprintDoRef, verificarEnvioIncremental } from "../.mentor/scripts/cobertura-incremental.ts";
import { perfilDeProcesso, politicaDaTarefa } from "../.mentor/scripts/politica-rigor.ts";
import { artefatosLocaisForaDaTarefa } from "../.mentor/scripts/cmd-tarefa.ts";

describe("vistas geradas de requisitos na cobertura (TASK-BG-029)", () => {
  it("dispensa os dois índices gerados e mantém a revisão de requisitos normativos", () => {
    expect(arquivoExigeRevisao("docs-mentor/requisitos/implementados.md")).toBe(false);
    expect(arquivoExigeRevisao("docs-mentor\\requisitos\\pendentes.md")).toBe(false);
    expect(arquivoExigeRevisao("docs-mentor/requisitos/RF-64.json")).toBe(true);
    expect(arquivoExigeRevisao("docs-mentor/requisitos/novo.md")).toBe(true);
    expect(arquivoExigeRevisao("docs-mentor/adrs/ADR-001.md")).toBe(true);
  });
});

describe("artefatos locais fora da tarefa (TASK-RF-079)", () => {
  const lab = ["laboratorio/**"];
  const dados = ["laboratorio/entrada.xlsx", "laboratorio/foto.jpeg", "laboratorio/rota.json"];

  it("separa somente dados não rastreados explicitamente indicados no laboratório", () => {
    expect(artefatosLocaisForaDaTarefa(dados, new Set(dados), lab)).toEqual(dados);
    expect(artefatosLocaisForaDaTarefa([], new Set(dados), lab)).toEqual([]);
  });

  it("mantém a trava para rastreados, fontes, configurações e exclusões amplas", () => {
    for (const arquivo of [
      "laboratorio/entrada.xlsx",
      "laboratorio/app.ts",
      "laboratorio/package.json",
      "laboratorio/tsconfig.json",
      "src/rota.json",
      "laboratorio/**",
      "laboratorio/../src/rota.json",
    ]) {
      const naoRastreados = new Set(arquivo.endsWith("entrada.xlsx") ? [] : [arquivo]);
      expect(() => artefatosLocaisForaDaTarefa([arquivo], naoRastreados, lab)).toThrow();
    }
  });

  it("CLI exige motivo, preserva código fora do plano e fecha sem incorporar dados locais", () => {
    const projeto = mkdtempSync(join(tmpdir(), "mentor-artefatos-locais-"));
    try {
      mentor(projeto, "init");
      const caminhoCtx = join(projeto, "docs-mentor", "contexto.json");
      const ctx = JSON.parse(readFileSync(caminhoCtx, "utf8"));
      ctx.laboratorio = { caminhos: lab, saidas: [], chaves: [], artefatos_importaveis: [] };
      writeFileSync(caminhoCtx, JSON.stringify(ctx));
      git(projeto, "init", "-b", "main");
      git(projeto, "config", "user.name", "Teste Mentor");
      git(projeto, "config", "user.email", "teste@mentor.invalid");
      git(projeto, "add", ".");
      git(projeto, "commit", "-m", "docs: estado inicial");
      mentor(
        projeto,
        "task",
        "nova",
        "--tipo",
        "CHORE",
        "--titulo",
        "Corrigir processo do Mentor",
        "--esforco",
        "P/P",
        "--origem",
        "titulo-autossuficiente",
        "--cerimonia",
        "Standard",
        "--perfil",
        "compacto"
      );
      mentor(projeto, "task", "puxar", "TASK-CHORE-001");
      mentor(projeto, "task", "iniciar", "TASK-CHORE-001");
      const caminhoTarefa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-001.json");
      const t = JSON.parse(readFileSync(caminhoTarefa, "utf8"));
      t.plano.muda = [".mentor/processos/revisao.md - ajuste de processo"];
      t.plano.criterios_aceite = [{ texto: "processo ajustado", teste: "inspeção local" }];
      t.plano.impacto = "somente Mentor";
      t.plano.riscos = ["regressão no processo"];
      writeFileSync(caminhoTarefa, JSON.stringify(t));
      mkdirSync(join(projeto, ".mentor", "processos"), { recursive: true });
      writeFileSync(join(projeto, ".mentor", "processos", "revisao.md"), "# Revisão\nAjuste local.\n");
      writeFileSync(caminhoTarefa.replace(/\.json$/, ".md"), "# Tarefa\n\n## Desfecho\nProcesso ajustado; validação pelo uso natural.\n");
      mkdirSync(join(projeto, "laboratorio"));
      writeFileSync(join(projeto, dados[0]!), "entrada fictícia");
      const comando = ["task", "finalizar", "TASK-CHORE-001", "--artefatos-locais", dados[0]!];
      const semMotivo = mentorComStatus(projeto, ...comando);
      expect(semMotivo.status).not.toBe(0);
      expect(semMotivo.saida).toContain("exige --motivo-artefatos-locais");
      const motivo = ["--motivo-artefatos-locais", "Entrada fictícia do operador, alheia ao ajuste do Mentor e excluída do commit."];
      writeFileSync(join(projeto, "laboratorio", "app.ts"), "export const valor = 1;\n");
      const comCodigo = mentorComStatus(projeto, ...comando, ...motivo);
      expect(comCodigo.status).not.toBe(0);
      expect(comCodigo.saida).toContain("laboratorio/app.ts");
      rmSync(join(projeto, "laboratorio", "app.ts"));
      const resultado = mentorComStatus(projeto, ...comando, ...motivo);
      expect(resultado.status, resultado.saida).toBe(0);
      expect(resultado.saida).toContain("1 artefato(s) local(is)");
      expect(readFileSync(join(projeto, dados[0]!), "utf8")).toBe("entrada fictícia");
      expect(spawnSync("git", ["ls-files", "--", dados[0]!], { cwd: projeto, encoding: "utf8" }).stdout).toBe("");
    } finally {
      if (resolve(projeto).startsWith(resolve(tmpdir()) + sep)) rmSync(projeto, { recursive: true, force: true });
    }
  }, 45_000);
});

describe("task iniciar preserva o plano aprovado (TASK-BG-032)", () => {
  it("iniciar preserva plano preenchido sem plano_ref e só semeia o modelo em plano vazio", () => {
    const projeto = mkdtempSync(join(tmpdir(), "mentor-iniciar-plano-"));
    try {
      mentor(projeto, "init");
      git(projeto, "init", "-b", "main");
      git(projeto, "config", "user.name", "Teste Mentor");
      git(projeto, "config", "user.email", "teste@mentor.invalid");
      git(projeto, "add", ".");
      git(projeto, "commit", "-m", "docs: estado inicial");
      const nova = (titulo: string, ...extra: string[]) =>
        mentor(projeto, "task", "nova", "--tipo", "CHORE", "--titulo", titulo, "--esforco", "P/P", "--origem", "titulo-autossuficiente", "--cerimonia", "Standard", ...extra);
      nova("Tarefa com plano completo aprovado");
      nova("Tarefa compacta com plano aprovado", "--perfil", "compacto");
      nova("Tarefa ainda sem plano");
      const caminho = (id: string) => join(projeto, "docs-mentor", "tarefas", "abertas", `${id}.json`);
      for (const id of ["TASK-CHORE-001", "TASK-CHORE-002"]) {
        const t = JSON.parse(readFileSync(caminho(id), "utf8"));
        t.plano = { ...t.plano, muda: ["src/aprovado.ts"], criterios_aceite: [{ texto: "plano aprovado no portão 1", teste: "src/aprovado.test.ts" }], impacto: "local", riscos: ["baixo"] };
        writeFileSync(caminho(id), JSON.stringify(t));
      }
      const caminhoCtx = join(projeto, "docs-mentor", "contexto.json");
      const ctx = JSON.parse(readFileSync(caminhoCtx, "utf8"));
      ctx.limites = { ...ctx.limites, em_execucao: 10 };
      writeFileSync(caminhoCtx, JSON.stringify(ctx));
      for (const id of ["TASK-CHORE-001", "TASK-CHORE-002", "TASK-CHORE-003"]) {
        mentor(projeto, "task", "puxar", id);
        const saida = mentor(projeto, "task", "iniciar", id);
        const t = JSON.parse(readFileSync(caminho(id), "utf8"));
        expect(t.estado, saida).toBe("em-execucao");
        if (id === "TASK-CHORE-003") {
          expect(t.plano.muda.join(" ")).toContain("PREENCHER");
        } else {
          expect(t.plano.muda).toEqual(["src/aprovado.ts"]);
          expect(t.plano.criterios_aceite).toEqual([{ texto: "plano aprovado no portão 1", teste: "src/aprovado.test.ts" }]);
        }
      }
    } finally {
      if (resolve(projeto).startsWith(resolve(tmpdir()) + sep)) rmSync(projeto, { recursive: true, force: true });
    }
  }, 60_000);
});

const RAIZ = resolve(import.meta.dirname, "..");

/** Roda o mentor deste projeto sobre outra pasta de projeto, sem tocar no projeto real. */
const mentor = (raiz: string, ...comando: string[]) => {
  const r = spawnSync(process.execPath, [join(RAIZ, "mentor.mjs"), ...comando], {
    cwd: RAIZ,
    encoding: "utf8",
    env: { ...process.env, MENTOR_RAIZ: raiz },
  });
  return `${r.stdout ?? ""}${r.stderr ?? ""}`;
};

const mentorComStatus = (raiz: string, ...comando: string[]) => {
  const r = spawnSync(process.execPath, [join(RAIZ, "mentor.mjs"), ...comando], {
    cwd: RAIZ,
    encoding: "utf8",
    env: { ...process.env, MENTOR_RAIZ: raiz },
  });
  return {
    status: r.status,
    saida: `${r.stdout ?? ""}${r.stderr ?? ""}`,
  };
};

const mentorComInput = (raiz: string, input: string, ...comando: string[]) => {
  const r = spawnSync(process.execPath, [join(RAIZ, "mentor.mjs"), ...comando], {
    cwd: RAIZ,
    encoding: "utf8",
    env: { ...process.env, MENTOR_RAIZ: raiz, MENTOR_HOOKS_STDIN: "1" },
    timeout: 10000,
    input,
  });
  return {
    status: r.status,
    saida: `${r.stdout ?? ""}${r.stderr ?? ""}`,
  };
};

const git = (raiz: string, ...args: string[]) => {
  const r = spawnSync("git", args, { cwd: raiz, encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`git ${args.join(" ")} falhou:\n${r.stdout ?? ""}${r.stderr ?? ""}`);
  }
};

describe("politica contextual do Mentor", () => {
  const contexto = (classificacao?: Record<string, unknown>) =>
    ({
      projeto: classificacao ? { classificacao } : {},
      rigor: { riscos: { dado_pessoal: "atual", cobranca_ou_dinheiro: "planejado", uso_por_terceiros: "planejado", decisao_automatizada_sobre_pessoa: "ausente" } },
      auditoria: { revisao_incremental_ativa: true },
      gates: { tipos: { comando: "typecheck" }, testes: { comando: "test" }, build: { comando: "build" } },
    }) as unknown as Contexto;
  const tarefa = (titulo: string, requerida = true) =>
    ({
      titulo,
      revisao_incremental_requerida: requerida,
      tipo: "CHORE",
      plano: { muda: ["src/app.ts"], impacto: null },
    }) as unknown as Tarefa;

  it("protótipo pessoal público aconselha rotina e bloqueia risco concreto", () => {
    const ctx = contexto({ finalidade: "pessoal", maturidade: "prototipo", visibilidade_codigo: "publico", uso_atual: "somente_autor" });
    expect(perfilDeProcesso(ctx)).toBe("enxuto");
    expect(perfilDeProcesso(contexto({ finalidade: "pessoal", maturidade: "prototipo", visibilidade_codigo: "publico", uso_atual: null }))).toBe("equilibrado");
    expect(politicaDaTarefa(ctx, tarefa("Ajustar interface"))).toMatchObject({ revisao: "avisa", gates: "avisa", validacao_manual: "avisa" });
    expect(politicaDaTarefa(ctx, tarefa("Migrar IndexedDB"))).toMatchObject({ revisao: "bloqueia", gates_obrigatorios: ["testes"], validacao_manual: "bloqueia" });
    expect(politicaDaTarefa(ctx, tarefa("Migrar IndexedDB", false)).revisao).toBe("dispensa");
  });

  it("contexto legado conserva rigor e produto em operação exige todos os gates", () => {
    expect(politicaDaTarefa(contexto(), tarefa("Ajustar interface")).gates_obrigatorios).toEqual(["tipos", "testes", "build"]);
    const produto = contexto({ finalidade: "comercial", maturidade: "produto", visibilidade_codigo: "privado", uso_atual: "publico" });
    expect(perfilDeProcesso(produto)).toBe("estrito");
    expect(politicaDaTarefa(produto, tarefa("Ajustar interface")).revisao).toBe("bloqueia");
  });
});

describe("marca (plano) no titulo do PR de planejamento", () => {
  it("o exemplo de PR de planejamento do entrega.md passa na marca (plano)", () => {
    const entrega = readFileSync(join(RAIZ, ".mentor", "processos", "entrega.md"), "utf8");
    const exemplo = entrega.match(/PR de planejamento[^\n]*\(ex\.: `([^`]+)`\)/)?.[1];

    expect(exemplo).toBeDefined();
    expect(MARCA_PLANO_NO_TITULO.test(exemplo ?? "")).toBe(true);
  });
});

describe("auditoria incremental do Mentor", () => {
  it("F11-5: REV desligada no ref enviado dispensa revisão e reativação volta a exigir", () => {
    const projeto = mkdtempSync(join(tmpdir(), "mentor-contexto-rev-"));
    try {
      git(projeto, "init", "-b", "main");
      git(projeto, "config", "user.name", "Teste Mentor");
      git(projeto, "config", "user.email", "teste@mentor.invalid");
      const pasta = join(projeto, "docs-mentor");
      mkdirSync(pasta, { recursive: true });
      const caminho = join(pasta, "contexto.json");
      writeFileSync(
        caminho,
        JSON.stringify({
          auditoria: { revisao_incremental_ativa: true, cadencia_em_tarefas: 10, ultima_em: "antes" },
          projeto: { nome: "Teste", maturidade: "prototipo" },
        })
      );
      git(projeto, "add", ".");
      git(projeto, "commit", "-m", "base");
      const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout.trim();

      writeFileSync(
        caminho,
        JSON.stringify({
          projeto: { maturidade: "prototipo", nome: "Teste" },
          auditoria: { ultima_em: "depois", cadencia_em_tarefas: 10, revisao_incremental_ativa: true },
        })
      );
      git(projeto, "add", ".");
      git(projeto, "commit", "-m", "docs(light): registrar auditoria");
      const metadados = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout.trim();
      expect(verificarEnvioIncremental(projeto, metadados, base)).toEqual([]);

      writeFileSync(
        caminho,
        JSON.stringify({
          auditoria: { revisao_incremental_ativa: false, cadencia_em_tarefas: 10, ultima_em: "depois" },
          projeto: { nome: "Teste", maturidade: "prototipo" },
        })
      );
      git(projeto, "add", ".");
      git(projeto, "commit", "-m", "docs(light): alterar politica");
      const politicaAlterada = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout.trim();
      expect(verificarEnvioIncremental(projeto, politicaAlterada, metadados)).toEqual([]);

      writeFileSync(
        caminho,
        JSON.stringify({
          auditoria: { revisao_incremental_ativa: true, cadencia_em_tarefas: 10, ultima_em: "depois" },
          projeto: { nome: "Teste", maturidade: "prototipo" },
        })
      );
      git(projeto, "add", ".");
      git(projeto, "commit", "-m", "docs(light): reativar politica");
      const politicaReativada = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout.trim();
      expect(verificarEnvioIncremental(projeto, politicaReativada, politicaAlterada).join(" ")).toContain("sem tarefa revisada");
    } finally {
      rmSync(projeto, { recursive: true, force: true });
    }
  }, 20000);

  it("F11-1: plano referenciado fornece critérios, risco e pacote inicial total limitado", () => {
    const projeto = mkdtempSync(join(tmpdir(), "mentor-plano-rev-"));
    const pasta = join(projeto, "docs-mentor", "auditorias");
    const planos = join(projeto, "docs-mentor", "rascunhos");
    mkdirSync(pasta, { recursive: true });
    mkdirSync(planos, { recursive: true });
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    const planoTexto = "# Plano de persistência\n";
    writeFileSync(join(planos, "plano.md"), planoTexto);
    writeFileSync(join(planos, "plano.contrato.json"), JSON.stringify({ muda: ["src.ts"], criterios_aceite: [{ texto: "dados persistidos sobrevivem" }], riscos: ["migração de dados"] }));
    writeFileSync(join(projeto, "src.ts"), "export const valor = 1;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "base");
    const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    writeFileSync(join(projeto, "src.ts"), "export const valor = 2;\n");
    const tarefa = {
      id: "TASK-CHORE-123",
      tipo: "CHORE",
      cerimonia: "Standard",
      commit_base: base,
      plano_ref: { arquivo: "docs-mentor/rascunhos/plano.md", sha256: hashSha256(planoTexto) },
      plano: { muda: [], criterios_aceite: [], riscos: [], impacto: null },
    } as unknown as Tarefa;
    const abertas = join(projeto, "docs-mentor", "tarefas", "abertas");
    mkdirSync(abertas, { recursive: true });
    writeFileSync(join(abertas, `${tarefa.id}.json`), JSON.stringify(tarefa));
    const r = prepararRevisaoIncremental({ raiz: projeto, pastaAuditorias: pasta, tarefa, tarefasConhecidas: [tarefa] });
    const indice = readFileSync(join(pasta, `${r.id}-dossie.md`), "utf8");
    const primeira = readFileSync(join(pasta, r.partes[0]!.arquivo), "utf8");
    expect(indice.length + primeira.length).toBeLessThanOrEqual(30_000);
    expect(primeira).toContain("dados persistidos sobrevivem");
    expect(r.regras.map((x) => x.regra)).toContain("persistência e migração");
    expect(r.contratos?.map((x) => x.caminho)).toContain("docs-mentor/rascunhos/plano.contrato.json");
    r.veredito = "APROVADO";
    r.sessao_revisora = "sessao-fixture";
    r.partes.forEach((p) => {
      p.lida = true;
    });
    writeFileSync(join(pasta, `${r.id}.json`), JSON.stringify(r));
    const caminhoContrato = join(planos, "plano.contrato.json");
    const contratoOriginal = readFileSync(caminhoContrato, "utf8");
    writeFileSync(caminhoContrato, contratoOriginal + "\n");
    expect(registrarRevisaoIncremental(projeto, pasta, r.id)).toBe(1);
    expect(JSON.parse(readFileSync(join(pasta, `${r.id}.json`), "utf8")).estado).toBe("desatualizada");
    writeFileSync(caminhoContrato, contratoOriginal);
    writeFileSync(join(projeto, "src.ts"), `export const texto = "${"x".repeat(70_000)}";\n`);
    const grande = prepararRevisaoIncremental({ raiz: projeto, pastaAuditorias: pasta, tarefa, tarefasConhecidas: [tarefa] });
    expect(grande.partes.length).toBeGreaterThan(1);
    const indiceGrande = readFileSync(join(pasta, `${grande.id}-dossie.md`), "utf8");
    const primeiraGrande = readFileSync(join(pasta, grande.partes[0]!.arquivo), "utf8");
    expect(indiceGrande.length + primeiraGrande.length).toBeLessThanOrEqual(30_000);
    rmSync(projeto, { recursive: true, force: true });
  }, 25_000);

  it("F11-3: finalizar recusa tarefa nova sem REV e aceita parecer atual", () => {
    expect(escopoExclusivoDoMentor([".mentor/processos/revisao.md", "docs-mentor/melhorias-do-pacote.test.ts"])).toBe(true);
    expect(escopoExclusivoDoMentor([".mentor/processos/revisao.md", "src/index.ts"])).toBe(false);
    expect(escopoExclusivoDoMentor([".mentor/processos/revisao.md", "docs-mentor/requisitos/requisitos.json"])).toBe(false);
    const projeto = mkdtempSync(join(tmpdir(), "mentor-fechamento-rev-"));
    mentor(projeto, "init");
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    mkdirSync(join(projeto, "src"), { recursive: true });
    writeFileSync(join(projeto, "src", "index.ts"), "export const valor = 1;\n");
    const caminhoCtx = join(projeto, "docs-mentor", "contexto.json");
    const ctx = JSON.parse(readFileSync(caminhoCtx, "utf8"));
    ctx.auditoria.revisao_incremental_ativa = true;
    ctx.qualidade = { ...(ctx.qualidade ?? {}), metodo_de_teste: "teste-depois" };
    ctx.gates = { tipos: { comando: 'node -e "process.exit(0)"' }, testes: { comando: "node -e \"console.log('1 passed')\"" } };
    writeFileSync(caminhoCtx, JSON.stringify(ctx, null, 2) + "\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "base");
    mentor(
      projeto,
      "task",
      "nova",
      "--tipo",
      "BG",
      "--titulo",
      "Corrigir valor com revisao",
      "--esforco",
      "P/P",
      "--origem",
      "titulo-autossuficiente",
      "--cerimonia",
      "Standard",
      "--perfil",
      "compacto"
    );
    mentor(projeto, "task", "puxar", "TASK-BG-001");
    mentor(projeto, "task", "iniciar", "TASK-BG-001");
    const camTarefa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-BG-001.json");
    const t = JSON.parse(readFileSync(camTarefa, "utf8"));
    expect(t.revisao_incremental_requerida).toBe(true);
    t.plano.muda = ["src/index.ts - corrigir valor"];
    t.plano.criterios_aceite = [{ texto: "valor atualizado", teste: 'node -e "process.exit(0)"' }];
    t.plano.impacto = "local";
    t.plano.riscos = ["regressão do valor"];
    writeFileSync(camTarefa, JSON.stringify(t, null, 2) + "\n");
    writeFileSync(join(projeto, "src", "index.ts"), "export const valor = 2;\n");
    const camNarrativa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-BG-001.md");
    writeFileSync(camNarrativa, "# TASK-BG-001 · Corrigir valor\n\n## Desfecho e Validacao Real\nComportamento observado em teste automatizado: valor 2. Sem armadilhas. Gates verdes.\n");
    const antes = mentorComStatus(projeto, "task", "finalizar", "TASK-BG-001", "--validacao-dispensada");
    expect(antes.status).not.toBe(0);
    expect(antes.saida).toContain("não possui REV");
    const gates = mentorComStatus(projeto, "task", "gates", "TASK-BG-001");
    expect(gates.status, gates.saida).toBe(0);
    const preparo = mentorComStatus(projeto, "auditar", "preparar", "--tarefa", "TASK-BG-001");
    expect(preparo.status, preparo.saida).toBe(0);
    const camRev = join(projeto, "docs-mentor", "auditorias", "REV-001.json");
    const rev = JSON.parse(readFileSync(camRev, "utf8"));
    rev.veredito = "APROVADO";
    rev.sessao_revisora = "sessao-revisora-fixture";
    rev.partes.forEach((p: { lida: boolean }) => {
      p.lida = true;
    });
    writeFileSync(camRev, JSON.stringify(rev, null, 2) + "\n");
    const registro = mentorComStatus(projeto, "auditar", "registrar", "REV-001");
    expect(registro.status, registro.saida).toBe(0);
    const foraDoManifesto = join(projeto, "src", "extra.ts");
    writeFileSync(foraDoManifesto, "export const extra = true;\n");
    const semCobertura = mentorComStatus(projeto, "task", "finalizar", "TASK-BG-001", "--validacao-dispensada");
    expect(semCobertura.status).not.toBe(0);
    expect(semCobertura.saida).toContain("arquivo src/extra.ts não está no manifesto revisado");
    rmSync(foraDoManifesto);
    const depois = mentorComStatus(projeto, "task", "finalizar", "TASK-BG-001", "--validacao-dispensada");
    expect(depois.status, depois.saida).toBe(0);
    expect(depois.saida).toContain("TASK-BG-001 concluida");
    expect(depois.saida).not.toContain("auditar preparar --lote-legado");
    const doctor = mentorComStatus(projeto, "doctor");
    expect(doctor.saida).toContain("revisão incremental ativa");
    expect(doctor.saida).not.toContain("Maiores arquivos:");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "fix(TASK-BG-001): corrige valor revisado");
    const finalSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    const concluida = readdirSync(join(projeto, "docs-mentor", "tarefas", "concluidas")).find((p) => p.endsWith("--TASK-BG-001.json"))!;
    const tarefaFinal = JSON.parse(readFileSync(join(projeto, "docs-mentor", "tarefas", "concluidas", concluida), "utf8"));
    expect(fingerprintDoRef(projeto, finalSha)).toBe(tarefaFinal.gates.tipos.arvore_hash);
    expect(verificarEnvioIncremental(projeto, finalSha, t.commit_base)).toEqual([]);
    const contextoMentor = JSON.parse(readFileSync(caminhoCtx, "utf8"));
    contextoMentor.gates.tipos.comando = 'node -e "process.exit(1)"';
    contextoMentor.gates.testes.comando = 'node -e "process.exit(1)"';
    contextoMentor.gates.validacao_manual = { existe: true };
    contextoMentor.qualidade.metodo_de_teste = "tdd";
    writeFileSync(caminhoCtx, JSON.stringify(contextoMentor, null, 2) + "\n");
    mentor(
      projeto,
      "task",
      "nova",
      "--tipo",
      "CHORE",
      "--titulo",
      "Corrigir processo do Mentor",
      "--esforco",
      "P/P",
      "--origem",
      "titulo-autossuficiente",
      "--cerimonia",
      "Standard",
      "--perfil",
      "compacto"
    );
    mentor(projeto, "task", "puxar", "TASK-CHORE-001");
    mentor(projeto, "task", "iniciar", "TASK-CHORE-001");
    const camChore = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-001.json");
    const chore = JSON.parse(readFileSync(camChore, "utf8"));
    expect(chore.revisao_incremental_requerida).toBe(true);
    chore.plano.muda = [".mentor/processos/revisao.md - corrigir o processo do Mentor"];
    chore.plano.criterios_aceite = [{ texto: "regra do Mentor ajustada", teste: "inspeção local" }];
    chore.plano.impacto = "somente Mentor";
    chore.plano.riscos = ["regressão no processo do Mentor"];
    chore.gates.testes = { rotulo: "APROVADO", vermelho_em: null, vermelho_dispensado: null };
    writeFileSync(camChore, JSON.stringify(chore, null, 2) + "\n");
    const guiaMentor = join(projeto, ".mentor", "processos", "revisao.md");
    mkdirSync(join(projeto, ".mentor", "processos"), { recursive: true });
    writeFileSync(guiaMentor, "# Revisao\n\nMelhoria local do Mentor.\n");
    writeFileSync(join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-001.md"), "# TASK-CHORE-001\n\n## Desfecho e Validacao Real\nProcesso local ajustado; validação pelo uso natural.\n");
    const fechamentoMentor = mentorComStatus(projeto, "task", "finalizar", "TASK-CHORE-001");
    expect(fechamentoMentor.status, fechamentoMentor.saida).toBe(0);
    const choreConcluida = readdirSync(join(projeto, "docs-mentor", "tarefas", "concluidas")).find((p) => p.endsWith("--TASK-CHORE-001.json"))!;
    const registroChore = JSON.parse(readFileSync(join(projeto, "docs-mentor", "tarefas", "concluidas", choreConcluida), "utf8"));
    expect(registroChore.validacao).toBe("nao_requer");
    expect(registroChore.revisao_incremental_requerida).toBe(false);
    expect(registroChore.gates.tipos).toBeUndefined();
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "fix(TASK-CHORE-001): corrige processo do Mentor");
    const mentorSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    const hookMentor = mentorComInput(projeto, `refs/heads/main ${mentorSha} refs/heads/mentor-local ${finalSha}\n`, "hooks", "--pre-push");
    expect(hookMentor.status, hookMentor.saida).toBe(0);
    expect(hookMentor.saida).toContain("gates do produto não se aplicam");
    rmSync(projeto, { recursive: true, force: true });
  }, 90_000);

  it("F11-4: envio de outro ramo usa o ref enviado e recusa alteração após o parecer", () => {
    const projeto = mkdtempSync(join(tmpdir(), "mentor-ref-revisao-"));
    const pasta = join(projeto, "docs-mentor", "auditorias");
    const abertas = join(projeto, "docs-mentor", "tarefas", "abertas");
    mkdirSync(pasta, { recursive: true });
    mkdirSync(abertas, { recursive: true });
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    writeFileSync(join(projeto, "src.ts"), "export const valor = 1;\n");
    writeFileSync(join(projeto, "outro.ts"), "export const outro = 1;\n");
    writeFileSync(join(projeto, "docs-mentor", "contexto.json"), JSON.stringify({ auditoria: { revisao_incremental_ativa: true }, gates: { tipos: { comando: 'node -e "process.exit(0)"' } } }));
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "base");
    const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    git(projeto, "checkout", "-b", "revisao-testada");
    const tarefa = {
      id: "TASK-CHORE-123",
      tipo: "CHORE",
      cerimonia: "Standard",
      revisao_incremental_requerida: true,
      commit_base: base,
      plano: { muda: ["src.ts", "outro.ts"], criterios_aceite: [{ texto: "valor 2" }], riscos: [], impacto: null },
      gates: {},
    } as unknown as Tarefa;
    const caminhoTarefa = join(abertas, `${tarefa.id}.json`);
    writeFileSync(caminhoTarefa, JSON.stringify(tarefa));
    writeFileSync(join(projeto, "src.ts"), "export const valor = 2;\n");
    writeFileSync(join(projeto, "outro.ts"), "export const outro = 2;\n");
    const r = prepararRevisaoIncremental({ raiz: projeto, pastaAuditorias: pasta, tarefa, tarefasConhecidas: [tarefa] });
    r.veredito = "APROVADO";
    r.sessao_revisora = "outra-sessao-fixture";
    r.partes.forEach((p) => {
      p.lida = true;
    });
    writeFileSync(join(pasta, `${r.id}.json`), JSON.stringify(r));
    expect(registrarRevisaoIncremental(projeto, pasta, r.id)).toBe(0);
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "feat(TASK-CHORE-123): altera valor com revisão");
    const codigoSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    const fingerprint = fingerprintDoRef(projeto, codigoSha);
    expect(fingerprint).toBeTruthy();
    tarefa.gates = { tipos: { rotulo: "APROVADO", comando: 'node -e "process.exit(0)"', arvore_hash: fingerprint, codigo_saida: 0 } } as unknown as Tarefa["gates"];
    writeFileSync(caminhoTarefa, JSON.stringify(tarefa));
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "chore(TASK-CHORE-123): registra gates");
    const revisadoSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    git(projeto, "checkout", "main");
    expect(verificarEnvioIncremental(projeto, revisadoSha, base)).toEqual([]);
    const hookAprovado = mentorComInput(projeto, `refs/heads/revisao-testada ${revisadoSha} refs/heads/main ${base}\n`, "hooks", "--pre-push");
    expect(hookAprovado.status, hookAprovado.saida).toBe(0);
    expect(fonteDoRef(projeto, revisadoSha).ler("src.ts")?.toString("utf8")).toContain("valor = 2");
    git(projeto, "checkout", "revisao-testada");
    git(projeto, "checkout", "-b", "legado-posterior");
    const legado = { ...tarefa, id: "TASK-CHORE-122", revisao_incremental_requerida: false, gates: {} };
    writeFileSync(join(abertas, "TASK-CHORE-122.json"), JSON.stringify(legado));
    writeFileSync(join(projeto, "src.ts"), "export const valor = 4;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "fix(TASK-CHORE-122): altera arquivo apos revisao nova");
    const legadoSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    git(projeto, "checkout", "main");
    expect(verificarEnvioIncremental(projeto, legadoSha, base).join(" ")).toContain("conteúdo final de src.ts diverge");
    git(projeto, "checkout", "revisao-testada");
    writeFileSync(join(projeto, "src.ts"), "export const valor = 3;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "fix(TASK-CHORE-123): altera depois do parecer");
    const vencidoSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    git(projeto, "checkout", "main");
    expect(verificarEnvioIncremental(projeto, vencidoSha, base).join(" ")).toContain("conteúdo de src.ts mudou");
    const hookVencido = mentorComInput(projeto, `refs/heads/revisao-testada ${vencidoSha} refs/heads/main ${base}\n`, "hooks", "--pre-push");
    expect(hookVencido.status).not.toBe(0);
    expect(hookVencido.saida).toContain("conteúdo de src.ts mudou");
    const wip = mentorComInput(projeto, `refs/heads/revisao-testada ${vencidoSha} refs/heads/wip/revisao ${base}\n`, "hooks", "--pre-push");
    expect(wip.status, wip.saida).toBe(0);
    git(projeto, "checkout", "revisao-testada");
    writeFileSync(join(projeto, "extra.ts"), "export const extra = true;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "feat(TASK-CHORE-123): adiciona arquivo fora do parecer");
    const extraSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    git(projeto, "checkout", "main");
    expect(verificarEnvioIncremental(projeto, extraSha, base).join(" ")).toContain("extra.ts não está no manifesto");
    git(projeto, "checkout", "-b", "light-documental");
    writeFileSync(join(projeto, "docs-mentor", "nota.md"), "Correção de grafia na nota.\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "docs(light): corrige grafia da nota");
    const lightDocSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    expect(verificarEnvioIncremental(projeto, lightDocSha, base)).toEqual([]);
    git(projeto, "checkout", "main");
    git(projeto, "checkout", "-b", "light-adr");
    mkdirSync(join(projeto, "docs-mentor", "arquitetura", "ADR"), { recursive: true });
    writeFileSync(join(projeto, "docs-mentor", "arquitetura", "ADR", "ADR-001.md"), "# Nova regra arquitetural\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "docs(light): altera ADR normativa");
    const lightAdrSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    expect(verificarEnvioIncremental(projeto, lightAdrSha, base).join(" ")).toContain("Light só dispensa documentação não normativa");
    git(projeto, "checkout", "light-documental");
    writeFileSync(join(projeto, "src.ts"), "  export const valor = 1;\n\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "style(light): apenas indentacao");
    const lightFormatoSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    expect(verificarEnvioIncremental(projeto, lightFormatoSha, base)).toEqual([]);
    writeFileSync(join(projeto, "src.ts"), "export const valor = 9;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "fix(light): muda comportamento sem revisão");
    const lightCodigoSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    expect(verificarEnvioIncremental(projeto, lightCodigoSha, base).join(" ")).toContain("Light só dispensa documentação não normativa ou formatação comprovada");
    rmSync(projeto, { recursive: true, force: true });
  }, 90_000);

  it("F11-2: parecer registrado cobre conteúdo e critérios intactos, mas vence após correção", () => {
    const projeto = mkdtempSync(join(tmpdir(), "mentor-cobertura-local-"));
    const pasta = join(projeto, "docs-mentor", "auditorias");
    const abertas = join(projeto, "docs-mentor", "tarefas", "abertas");
    mkdirSync(pasta, { recursive: true });
    mkdirSync(abertas, { recursive: true });
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    writeFileSync(join(projeto, "src.ts"), "export const valor = 1;\n");
    writeFileSync(join(projeto, "outro.ts"), "export const outro = 1;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "base");
    const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    const tarefa = {
      id: "TASK-CHORE-123",
      tipo: "CHORE",
      cerimonia: "Standard",
      revisao_incremental_requerida: true,
      commit_base: base,
      plano: { muda: ["src.ts", "outro.ts"], criterios_aceite: [{ texto: "valor 2" }], riscos: [], impacto: null },
      gates: {},
    } as unknown as Tarefa;
    const caminhoTarefa = join(abertas, `${tarefa.id}.json`);
    writeFileSync(caminhoTarefa, JSON.stringify(tarefa));
    writeFileSync(join(projeto, "src.ts"), "export const valor = 2;\n");
    writeFileSync(join(projeto, "outro.ts"), "export const outro = 2;\n");
    const r = prepararRevisaoIncremental({ raiz: projeto, pastaAuditorias: pasta, tarefa, tarefasConhecidas: [tarefa] });
    const caminhoRev = join(pasta, `${r.id}.json`);
    expect(verificarCobertura(tarefa, fonteLocal(projeto), ["src.ts"]).ok).toBe(false);
    r.veredito = "APROVADO";
    r.sessao_revisora = "outra-sessao-fixture";
    r.partes.forEach((p) => {
      p.lida = true;
    });
    writeFileSync(caminhoRev, JSON.stringify(r));
    expect(registrarRevisaoIncremental(projeto, pasta, r.id)).toBe(0);
    const fonte = fonteLocal(projeto);
    expect(verificarCobertura(tarefa, fonte, ["src.ts"]).ok).toBe(true);
    const parcial = JSON.parse(readFileSync(caminhoRev, "utf8"));
    parcial.estado = "parcial";
    writeFileSync(caminhoRev, JSON.stringify(parcial));
    expect(verificarCobertura(tarefa, fonte, ["src.ts"]).ok).toBe(false);
    parcial.estado = "aprovada";
    writeFileSync(caminhoRev, JSON.stringify(parcial));
    tarefa.plano.criterios_aceite[0]!.texto = "valor 3";
    writeFileSync(caminhoTarefa, JSON.stringify(tarefa));
    expect(verificarCobertura(tarefa, fonte, ["src.ts"]).problemas.join(" ")).toContain("critérios/plano");
    tarefa.plano.criterios_aceite[0]!.texto = "valor 2";
    writeFileSync(caminhoTarefa, JSON.stringify(tarefa));
    writeFileSync(join(projeto, "src.ts"), "export const valor = 3;\n");
    expect(verificarCobertura(tarefa, fonte, ["src.ts"]).problemas.join(" ")).toContain("conteúdo de src.ts mudou");
    const corrigida = prepararRevisaoIncremental({ raiz: projeto, pastaAuditorias: pasta, tarefa, tarefasConhecidas: [tarefa] });
    expect(corrigida.revisao_anterior).toBe(r.id);
    expect(corrigida.arquivos.find((a) => a.caminho === "outro.ts")?.cobertura_herdada_de).toBe(r.id);
    expect(corrigida.partes.flatMap((p) => p.arquivos)).not.toContain("outro.ts");
    corrigida.veredito = "APROVADO";
    corrigida.sessao_revisora = "terceira-sessao-fixture";
    corrigida.partes.forEach((p) => {
      p.lida = true;
    });
    writeFileSync(join(pasta, `${corrigida.id}.json`), JSON.stringify(corrigida));
    expect(registrarRevisaoIncremental(projeto, pasta, corrigida.id)).toBe(0);
    expect(verificarCobertura(tarefa, fonte, ["src.ts", "outro.ts"]).ok).toBe(true);
    rmSync(projeto, { recursive: true, force: true });
  });

  it("interpreta nomes Git com acentos, espaços e renomes sem perder caminhos", () => {
    const itens = interpretarNameStatus(Buffer.from("R100\0antigo nome.ts\0novo nome.ts\0M\0ação.ts\0", "utf8"));
    expect(itens).toEqual([
      { status: "R100", anterior: "antigo nome.ts", caminho: "novo nome.ts" },
      { status: "M", caminho: "ação.ts" },
    ]);
  });

  it("divide diffs grandes sem exceder o teto e sem perder o conteúdo", () => {
    const texto = `diff --git a/a.ts b/a.ts\n${Array.from({ length: 90 }, (_, i) => `+linha-${i}-${"x".repeat(18)}`).join("\n")}`;
    const partes = dividirEmPartes(["Instruções curtas"], [{ caminho: "a.ts", texto }], 900);
    expect(partes.length).toBeGreaterThan(1);
    expect(partes.every((p) => p.texto.length <= 900)).toBe(true);
    expect(partes.map((p) => p.texto).join("\n")).toContain("+linha-89-");
    expect(partes.flatMap((p) => p.arquivos).every((p) => p === "a.ts")).toBe(true);
  });

  it("recusa contexto absoluto, travessia e symlink para fora do projeto", () => {
    const raiz = mkdtempSync(join(tmpdir(), "mentor-contexto-seguro-"));
    const externo = mkdtempSync(join(tmpdir(), "mentor-contexto-externo-"));
    writeFileSync(join(raiz, "ok.md"), "conteúdo local");
    writeFileSync(join(externo, "segredo.md"), "segredo");
    try {
      symlinkSync(join(externo, "segredo.md"), join(raiz, "atalho.md"));
    } catch {
      /* permissões de symlink variam no Windows */
    }
    expect(validarCaminhoContextual(raiz, "ok.md")).toBe("conteúdo local");
    expect(() => validarCaminhoContextual(raiz, "../fora.md")).toThrow();
    expect(() => validarCaminhoContextual(raiz, join(externo, "segredo.md"))).toThrow();
    if (existsSync(join(raiz, "atalho.md"))) expect(() => validarCaminhoContextual(raiz, "atalho.md")).toThrow();
    rmSync(raiz, { recursive: true, force: true });
    rmSync(externo, { recursive: true, force: true });
  });

  it("captura somente a unidade declarada em snapshot, sem alterar o índice Git", () => {
    const projeto = mkdtempSync(join(tmpdir(), "mentor-revisao-incremental-"));
    const pasta = join(projeto, "docs-mentor", "auditorias");
    mkdirSync(pasta, { recursive: true });
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    writeFileSync(join(projeto, "src.ts"), "export const valor = 1;\n");
    writeFileSync(join(projeto, "outro.ts"), "export const outro = 1;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "base");
    const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    writeFileSync(join(projeto, "src.ts"), "export const valor = 2;\n");
    writeFileSync(join(projeto, "outro.ts"), "export const outro = 2;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "fix(TASK-CHORE-123): mudança local");
    const indiceAntes = spawnSync("git", ["write-tree"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    const tarefa = { id: "TASK-CHORE-123", commit_base: base, plano: { muda: ["src.ts"], criterios_aceite: [{ texto: "valor atualizado" }] } } as unknown as Tarefa;
    const registro = prepararRevisaoIncremental({ raiz: projeto, pastaAuditorias: pasta, tarefa, tarefasConhecidas: [tarefa] });
    const indiceDepois = spawnSync("git", ["write-tree"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    expect(registro.arquivos.map((a) => a.caminho)).toEqual(["src.ts"]);
    expect(registro.partes.length).toBeGreaterThan(0);
    expect(indiceDepois).toBe(indiceAntes);
    expect(existsSync(join(pasta, `${registro.id}-dossie.md`))).toBe(true);
    rmSync(projeto, { recursive: true, force: true });
  });

  it("marca a revisão como desatualizada se o arquivo muda depois da captura", () => {
    const projeto = mkdtempSync(join(tmpdir(), "mentor-revisao-desatualizada-"));
    const pasta = join(projeto, "auditorias");
    mkdirSync(pasta, { recursive: true });
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    writeFileSync(join(projeto, "src.ts"), "export const valor = 1;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "base");
    const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    writeFileSync(join(projeto, "src.ts"), "export const valor = 2;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "fix(TASK-CHORE-123): mudança");
    const tarefa = { id: "TASK-CHORE-123", commit_base: base, plano: { muda: ["src.ts"], criterios_aceite: [{ texto: "valor atualizado" }] } } as unknown as Tarefa;
    const registro = prepararRevisaoIncremental({ raiz: projeto, pastaAuditorias: pasta, tarefa, tarefasConhecidas: [tarefa] });
    const arquivoRegistro = join(pasta, `${registro.id}.json`);
    const alterado = JSON.parse(readFileSync(arquivoRegistro, "utf8"));
    alterado.veredito = "APROVADO";
    alterado.sessao_revisora = "sessao-independente-fixture";
    alterado.nao_verificado = ["nenhum outro caminho revisado"];
    alterado.partes.forEach((parte: { lida: boolean }) => {
      parte.lida = true;
    });
    writeFileSync(arquivoRegistro, JSON.stringify(alterado));
    writeFileSync(join(projeto, "src.ts"), "export const valor = 3;\n");
    expect(registrarRevisaoIncremental(projeto, pasta, registro.id)).toBe(1);
    expect(JSON.parse(readFileSync(arquivoRegistro, "utf8")).estado).toBe("desatualizada");
    rmSync(projeto, { recursive: true, force: true });
  });

  it("vincula um co-commit aos dois planos e aponta a revisão seguinte para a anterior", () => {
    const projeto = mkdtempSync(join(tmpdir(), "mentor-revisao-cocommit-"));
    const pasta = join(projeto, "auditorias");
    mkdirSync(pasta, { recursive: true });
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    writeFileSync(join(projeto, "a.ts"), "export const a = 1;\n");
    writeFileSync(join(projeto, "b.ts"), "export const b = 1;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "base");
    const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    writeFileSync(join(projeto, "a.ts"), "export const a = 2;\n");
    writeFileSync(join(projeto, "b.ts"), "export const b = 2;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "fix(TASK-CHORE-123 TASK-RF-124): co-commit");
    const tarefaA = { id: "TASK-CHORE-123", commit_base: base, plano: { muda: ["a.ts"], criterios_aceite: [{ texto: "a correto" }] } } as unknown as Tarefa;
    const tarefaB = { id: "TASK-RF-124", commit_base: base, plano: { muda: ["b.ts"], criterios_aceite: [{ texto: "b correto" }] } } as unknown as Tarefa;
    const primeira = prepararRevisaoIncremental({ raiz: projeto, pastaAuditorias: pasta, tarefa: tarefaA, tarefasConhecidas: [tarefaA, tarefaB] });
    expect(primeira.tarefas).toEqual(["TASK-CHORE-123", "TASK-RF-124"]);
    expect(primeira.arquivos.map((a) => a.caminho)).toEqual(["a.ts", "b.ts"]);
    writeFileSync(join(projeto, "a.ts"), "export const a = 3;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "fix(TASK-CHORE-123): ajuste posterior");
    const segunda = prepararRevisaoIncremental({ raiz: projeto, pastaAuditorias: pasta, tarefa: tarefaA, tarefasConhecidas: [tarefaA, tarefaB] });
    expect(segunda.id).not.toBe(primeira.id);
    expect(segunda.revisao_anterior).toBe(primeira.id);
    expect(readFileSync(join(pasta, `${primeira.id}.json`), "utf8")).toContain(primeira.unidade.id);
    rmSync(projeto, { recursive: true, force: true });
  }, 20_000);

  it("marca como ambígua uma mudança intercalada de outra tarefa no mesmo arquivo", () => {
    const projeto = mkdtempSync(join(tmpdir(), "mentor-revisao-intercalada-"));
    const pasta = join(projeto, "auditorias");
    mkdirSync(pasta, { recursive: true });
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    writeFileSync(join(projeto, "src.ts"), "export const valor = 1;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "base");
    const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout?.trim() ?? "";
    writeFileSync(join(projeto, "src.ts"), "export const valor = 2;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "fix(TASK-CHORE-123): primeira alteração");
    writeFileSync(join(projeto, "src.ts"), "export const valor = 3;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "fix(TASK-RF-124): alteração intercalada");
    const tarefa = { id: "TASK-CHORE-123", commit_base: base, plano: { muda: ["src.ts"], criterios_aceite: [{ texto: "valor correto" }] } } as unknown as Tarefa;
    const registro = prepararRevisaoIncremental({ raiz: projeto, pastaAuditorias: pasta, tarefa, tarefasConhecidas: [tarefa] });
    expect(registro.arquivos[0]?.ambiguidade).toContain("Commits externos");
    rmSync(projeto, { recursive: true, force: true });
  });

  it("carrega somente AUD como legado e ainda resolve sua pendência", () => {
    const projeto = mkdtempSync(join(tmpdir(), "mentor-auditoria-legada-"));
    mentor(projeto, "init");
    const auditorias = join(projeto, "docs-mentor", "auditorias");
    mkdirSync(auditorias, { recursive: true });
    const pendencia = {
      id: "AUD-005-B01",
      nivel: "bloqueia",
      descricao: "achado legado de fixture",
      tarefas: ["TASK-CHORE-123"],
      destino: null,
      ref: null,
      resolvida_em: null,
    };
    writeFileSync(
      join(auditorias, "AUD-005.json"),
      JSON.stringify({
        id: "AUD-005",
        lote: ["TASK-CHORE-123"],
        commit_base: null,
        commit_final: null,
        preparada_em: "fixture",
        registrada_em: "fixture",
        veredito: "APROVADO COM RESSALVAS",
        nao_verificado: ["fixture"],
        pendencias: [pendencia],
      })
    );
    writeFileSync(join(auditorias, "REV-001.json"), JSON.stringify({ schema: "auditoria-incremental/1", pendencias: [] }));
    const raizAnterior = process.env.MENTOR_RAIZ;
    process.env.MENTOR_RAIZ = projeto;
    try {
      expect(carregarAuditorias().map((a) => a.id)).toEqual(["AUD-005"]);
      expect(resolverAuditoria("AUD-005-B01", { destino: "tarefa", ref: "TASK-CHORE-124" })).toBe(0);
      expect(JSON.parse(readFileSync(join(auditorias, "AUD-005.json"), "utf8")).pendencias[0].destino).toBe("tarefa");
    } finally {
      if (raizAnterior === undefined) delete process.env.MENTOR_RAIZ;
      else process.env.MENTOR_RAIZ = raizAnterior;
      rmSync(projeto, { recursive: true, force: true });
    }
  }, 20_000);
});

describe("triagem de auditoria em PR de planejamento", () => {
  let projeto = "";
  let saidaPlano = "";
  let saidaLight = "";
  let saidaTarefaAberta = "";

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-plano-auditoria-"));
    mentor(projeto, "init");
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "docs: estado inicial");
    git(projeto, "switch", "-c", "plan/triagem-auditoria");

    mkdirSync(join(projeto, "docs-mentor", "auditorias"), { recursive: true });
    mkdirSync(join(projeto, "docs-mentor", "dividas"), { recursive: true });
    mkdirSync(join(projeto, "docs-mentor", "tarefas", "abertas"), { recursive: true });
    writeFileSync(join(projeto, "docs-mentor", "auditorias", "AUD-004.json"), '{"id":"AUD-004"}\n');
    writeFileSync(join(projeto, "docs-mentor", "dividas", "dividas.json"), "[]\n");
    writeFileSync(join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-DOC-011.json"), '{"id":"TASK-DOC-011","estado":"aberta"}\n');
    writeFileSync(join(projeto, "docs-mentor", "tarefas", "reserva.md"), "# Reserva\n\nTASK-DOC-011\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "docs(plano): triar auditoria");

    saidaPlano = mentor(projeto, "pronto-para-merge", "--titulo", "docs(plano): registrar a AUD-004 e criar a TASK-DOC-011 e a DT-012", "--base", "main");
    saidaLight = mentor(projeto, "pronto-para-merge", "--titulo", "docs(light): registrar e triar a AUD-004, criar a TASK-DOC-011 e a DT-012 e anotar melhorias do pacote", "--base", "main");

    writeFileSync(join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-999.json"), '{"id":"TASK-CHORE-999","estado":"aberta"}\n');
    saidaTarefaAberta = mentor(projeto, "pronto-para-merge", "--titulo", "fix(TASK-CHORE-999): corrigir o gate", "--base", "main");
  }, 60_000);

  afterAll(() => {
    if (projeto) rmSync(projeto, { recursive: true, force: true });
  });

  it("escopos explicitos prevalecem sobre IDs citados no assunto", () => {
    expect(saidaPlano).toContain("Pronto para merge: PR de planejamento (plano) validado.");
    expect(saidaPlano).not.toContain('TASK-DOC-011 esta "aberta"');
    expect(saidaLight).toContain("Pronto para merge: PR Light, sem tarefa.");
    expect(saidaLight).not.toContain('TASK-DOC-011 esta "aberta"');
  });

  it("PR de planejamento aceita os registros produzidos pela triagem de auditoria", () => {
    expect(saidaPlano).not.toContain("docs-mentor/auditorias/AUD-004.json");
    expect(saidaPlano).not.toContain("docs-mentor/dividas/dividas.json");
    expect(saidaPlano).toContain("Pronto para merge: PR de planejamento (plano) validado.");
  });

  it("PR de entrega continua exigindo a tarefa concluida", () => {
    expect(saidaTarefaAberta).toContain('TASK-CHORE-999 esta "aberta"');
    expect(saidaTarefaAberta).not.toContain("Pronto para merge:");
  });
});

/** Mesma pasta com as letras trocadas acima do projeto. So existe em sistema que ignora maiusculas. */
const comOutraCaixaAcima = (pasta: string) => dirname(pasta).toUpperCase() + sep + basename(pasta);
const IGNORA_MAIUSCULAS = tmpdir() !== tmpdir().toUpperCase() && existsSync(tmpdir().toUpperCase());

describe.skipIf(!IGNORA_MAIUSCULAS)("verificar com o projeto aberto por outra caixa", () => {
  let projeto = "";
  let saida = "";

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-caixa-"));
    mentor(projeto, "init");
    writeFileSync(join(projeto, "docs-mentor", "alvo.md"), "# Alvo\n");
    writeFileSync(join(projeto, "docs-mentor", "nota.md"), "[certo](alvo.md) e [errado](ALVO.md)\n");
    saida = mentor(comOutraCaixaAcima(projeto), "verificar");
  }, 60_000);

  afterAll(() => {
    if (projeto) rmSync(projeto, { recursive: true, force: true });
  });

  it("caixa diferente acima da raiz do projeto nao reprova link certo", () => {
    expect(saida).not.toContain('link "alvo.md"');
  });

  it("caixa errada dentro do projeto continua acusada", () => {
    expect(saida).toContain('link "ALVO.md" so resolve porque este sistema de arquivos ignora maiusculas');
  });
});

describe("contexto.json sem regravacao automatica", () => {
  let projeto = "";
  let depoisDoPrimeiroGerar = "";
  let depoisDoSegundoGerar = "";
  let saidaDoDoctor = "";
  let depoisDoPrimeiroDoctor = "";
  let depoisDoSegundoDoctor = "";

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-contexto-"));
    const contexto = () => readFileSync(join(projeto, "docs-mentor", "contexto.json"), "utf8");
    mentor(projeto, "init");
    mentor(projeto, "gerar");
    depoisDoPrimeiroGerar = contexto();
    mentor(projeto, "gerar");
    depoisDoSegundoGerar = contexto();
    saidaDoDoctor = mentor(projeto, "doctor");
    depoisDoPrimeiroDoctor = contexto();
    mentor(projeto, "doctor");
    depoisDoSegundoDoctor = contexto();
  }, 90_000);

  afterAll(() => {
    if (projeto) rmSync(projeto, { recursive: true, force: true });
  });

  it("gerar duas vezes sem mudanca real nao muda o contexto.json", () => {
    expect(depoisDoSegundoGerar).toBe(depoisDoPrimeiroGerar);
  });

  it("doctor duas vezes nao muda o contexto.json", () => {
    expect(depoisDoSegundoDoctor).toBe(depoisDoPrimeiroDoctor);
  });

  it("doctor mostra lembretes sem grava-los no contexto.json", () => {
    expect(saidaDoDoctor).toContain("⚠");
    expect(JSON.parse(depoisDoPrimeiroDoctor).lembretes).toEqual([]);
  });
});

describe("preservacao do indice git durante execucao do mentor", () => {
  let projeto = "";

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-indice-git-"));
    mentor(projeto, "init");
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    writeFileSync(join(projeto, "base.txt"), "base\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "chore: base");
  });

  afterAll(() => {
    if (projeto) rmSync(projeto, { recursive: true, force: true });
  });

  it("operacoes de leitura e hash nao alteram o staging area existente", () => {
    // Cria mudanca em staging e mudanca no working tree
    writeFileSync(join(projeto, "modificado.txt"), "staged\n");
    git(projeto, "add", "modificado.txt");
    writeFileSync(join(projeto, "modificado.txt"), "staged + working tree\n");

    const diffStagedAntes = spawnSync("git", ["diff", "--staged"], { cwd: projeto, encoding: "utf8" }).stdout;
    expect(diffStagedAntes).toContain("+staged");

    // Executa comando do mentor
    const saida = mentor(projeto, "gerar");
    expect(saida).toContain("Vistas regeneradas.");

    const diffStagedDepois = spawnSync("git", ["diff", "--staged"], { cwd: projeto, encoding: "utf8" }).stdout;
    expect(diffStagedDepois).toBe(diffStagedAntes);

    const diffWorkingTree = spawnSync("git", ["diff"], { cwd: projeto, encoding: "utf8" }).stdout;
    expect(diffWorkingTree).toContain("+staged + working tree");
  });
});

describe("resiliencia com tarefas legadas e hashes de arvore", () => {
  let projeto = "";

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-legado-"));
    mentor(projeto, "init");
  });

  afterAll(() => {
    if (projeto) rmSync(projeto, { recursive: true, force: true });
  });

  it("carrega tarefa em formato legado sem campos opcionais novos", () => {
    const tarefaLegada = {
      id: "TASK-LEGADA-001",
      tipo: "chore",
      titulo: "Tarefa antiga de versao anterior",
      estado: "aberta",
      cerimonia: "Standard",
      fila: "ciclo",
      valor: "desejavel",
      urgencia: "normal",
      esforco: { humano: "P", ia: "P" },
      depende_de: [],
      requisitos: [],
      origem: "manual",
      criada_em: "2026-01-01T00:00:00.000Z",
      plano: {
        muda: ["codigo"],
        criterios_aceite: [{ texto: "Funcionar", teste: "npm test" }],
        impacto: "baixo",
        riscos: [],
        dependencias_novas: [],
        proporcionalidade: "adequada",
      },
    };

    mkdirSync(join(projeto, "docs-mentor", "tarefas", "abertas"), { recursive: true });
    writeFileSync(join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-LEGADA-001.json"), JSON.stringify(tarefaLegada, null, 2));

    const saidaGerar = mentor(projeto, "gerar");
    expect(saidaGerar).toContain("Vistas regeneradas.");
    const backlog = readFileSync(join(projeto, "docs-mentor", "tarefas", "backlog.md"), "utf8");
    expect(backlog).toContain("TASK-LEGADA-001");
  });

  it("ambiente sem git retorna hash nulo sem quebrar", () => {
    // Projeto temporario sem git init
    const pastaSemGit = mkdtempSync(join(tmpdir(), "mentor-sem-git-"));
    try {
      mentor(pastaSemGit, "init");
      const saida = mentor(pastaSemGit, "gerar");
      expect(saida).toContain("Vistas regeneradas.");
    } finally {
      rmSync(pastaSemGit, { recursive: true, force: true });
    }
  });

  // No piloto havia aqui um teste de que o proprio arquivo de regressoes existia. No pacote ele nao
  // provaria comportamento; a inclusao de testes sob docs-mentor/ no hash dos insumos esta' no E03-2.
});

describe("planejamento portatil (Etapa 01)", () => {
  let projeto = "";

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-plano-portatil-"));
    mentor(projeto, "init");
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    writeFileSync(join(projeto, "base.txt"), "base\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "chore: base");
  });

  afterAll(() => {
    if (projeto) rmSync(projeto, { recursive: true, force: true });
  });

  it("P01-1 e P01-2: importa plano preservando SHA-256 exato e inicia tarefa sem alterar bytes da fonte", () => {
    // Cria plano externo com texto livre, acentos e espacos
    const pastaExterna = mkdtempSync(join(tmpdir(), "mentor-externo-"));
    const conteudoOriginal = "# Plano de Migração V5\n\nEste é um plano com acentuação e formatação especial.\n\n## Seção 01\nDetalhes de execução.\n";
    const arquivoExterno = join(pastaExterna, "plano original.md");
    writeFileSync(arquivoExterno, conteudoOriginal, "utf8");

    // Importa plano para o projeto
    const destinoRel = "docs-mentor/rascunhos/plano-migracao.md";
    const saidaImportar = mentor(projeto, "plano", "importar", "--arquivo", arquivoExterno, "--destino", destinoRel);
    expect(saidaImportar).toContain("Plano importado literalmente");

    // Confere preservação exata dos bytes
    const conteudoImportado = readFileSync(join(projeto, destinoRel), "utf8");
    expect(conteudoImportado).toBe(conteudoOriginal);

    // Cria tarefa e vincula ao plano importado
    mentor(projeto, "task", "nova", "--tipo", "CHORE", "--titulo", "Migrar para V5", "--esforco", "P/P", "--origem", "titulo-autossuficiente");
    mentor(projeto, "task", "puxar", "TASK-CHORE-001");
    const saidaVincular = mentor(projeto, "task", "vincular-plano", "TASK-CHORE-001", "--arquivo", destinoRel, "--secao", "Seção 01");
    expect(saidaVincular).toContain("TASK-CHORE-001 vinculada ao plano");

    // Inicia a tarefa
    const bytesAntesIniciar = readFileSync(join(projeto, destinoRel));
    const saidaIniciar = mentor(projeto, "task", "iniciar", "TASK-CHORE-001");
    expect(saidaIniciar).toContain("TASK-CHORE-001 em execucao");

    // Bytes do plano referenciado permanecem byte a byte intocados
    const bytesDepoisIniciar = readFileSync(join(projeto, destinoRel));
    expect(Buffer.compare(bytesAntesIniciar, bytesDepoisIniciar)).toBe(0);

    // Listar planos exibe o plano e a tarefa vinculada
    const saidaPlanos = mentor(projeto, "planos");
    expect(saidaPlanos).toContain("Plano de Migração V5");
    expect(saidaPlanos).toContain("TASK-CHORE-001");

    rmSync(pastaExterna, { recursive: true, force: true });
  }, 25_000);

  it("P01-3: valida secao inexistente e suporta caminhos com espacos e caracteres acentuados", () => {
    const planoComEspaco = "docs-mentor/rascunhos/plano com espaço e acentuação.md";
    writeFileSync(join(projeto, planoComEspaco), "# Título do Plano\n\n## Seção Válida\nConteúdo\n", "utf8");

    // Seção válida registra com sucesso
    const saidaOk = mentor(projeto, "plano", "registrar", "--arquivo", planoComEspaco, "--secao", "Seção Válida");
    expect(saidaOk).toContain("Plano registrado");

    // Seção inexistente é recusada com mensagem útil
    const saidaErroSecao = mentor(projeto, "plano", "registrar", "--arquivo", planoComEspaco, "--secao", "Seção Inexistente");
    expect(saidaErroSecao).toContain('Secao "Seção Inexistente" nao encontrada');
  });

  it("P01-4: detecta revisao divergente quando plano referenciado e modificado", () => {
    const caminhoPlano = "docs-mentor/rascunhos/plano-divergente.md";
    writeFileSync(join(projeto, caminhoPlano), "# Plano Divergente\n\nConteúdo inicial\n", "utf8");

    mentor(projeto, "task", "nova", "--tipo", "CHORE", "--titulo", "Teste Divergencia", "--esforco", "P/P", "--origem", "titulo-autossuficiente");
    mentor(projeto, "task", "puxar", "TASK-CHORE-002");
    mentor(projeto, "task", "vincular-plano", "TASK-CHORE-002", "--arquivo", caminhoPlano);
    mentor(projeto, "task", "iniciar", "TASK-CHORE-002");

    // Altera o plano sem atualizar o vínculo
    writeFileSync(join(projeto, caminhoPlano), "# Plano Divergente\n\nConteúdo modificado clandestinamente\n", "utf8");

    // Tentativa de finalizar detecta a revisão divergente
    const saidaFinalizar = mentor(projeto, "task", "finalizar", "TASK-CHORE-002");
    expect(saidaFinalizar).toContain("revisao divergente");
  }, 25_000);
});

describe("executor unificado de gates (Etapa 02)", () => {
  let projeto = "";

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-executor-gates-"));
    mentor(projeto, "init");
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    writeFileSync(join(projeto, "base.txt"), "base\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "chore: base");

    // Configura gates de teste no contexto
    const caminhoCtx = join(projeto, "docs-mentor", "contexto.json");
    const ctx = JSON.parse(readFileSync(caminhoCtx, "utf8"));
    ctx.gates = {
      tipos: { comando: 'node -e "process.exit(0)"' },
      lint: { comando: 'node -e "process.exit(1)"' },
      testes: { comando: "node -e \"console.log('3 passed'); process.exit(0)\"" },
      build: { comando: 'node -e "process.exit(0)"' },
    };
    writeFileSync(caminhoCtx, JSON.stringify(ctx, null, 2) + "\n", "utf8");

    mentor(projeto, "task", "nova", "--tipo", "CHORE", "--titulo", "Teste Gates", "--esforco", "P/P", "--origem", "titulo-autossuficiente");
    mentor(projeto, "task", "puxar", "TASK-CHORE-001");
    mentor(projeto, "task", "iniciar", "TASK-CHORE-001");
  });

  afterAll(() => {
    if (projeto) rmSync(projeto, { recursive: true, force: true });
  });

  it("G02-1: propaga codigo de saida nao-zero para gate falho e zero para silencioso valido", () => {
    // Gate silencioso com exit 0 deve retornar status 0 (sucesso)
    const resTipos = mentorComStatus(projeto, "task", "gate", "TASK-CHORE-001", "tipos");
    expect(resTipos.status).toBe(0);
    expect(resTipos.saida).toContain("APROVADO: tipos");

    // Gate com exit 1 deve retornar status 1 (falha propagada para CLI)
    const resLint = mentorComStatus(projeto, "task", "gate", "TASK-CHORE-001", "lint");
    expect(resLint.status).not.toBe(0);
    expect(resLint.saida).toContain("FALHOU: lint");
  }, 25_000);

  it("G02-2: task gates <ID> executa em sequencia e para no primeiro erro persistindo evidencias", () => {
    const resBateria = mentorComStatus(projeto, "task", "gates", "TASK-CHORE-001");
    expect(resBateria.status).not.toBe(0);
    expect(resBateria.saida).toContain("APROVADO: tipos");
    expect(resBateria.saida).toContain("FALHOU: lint");
    expect(resBateria.saida).toContain("Bateria interrompida na primeira falha");

    // Verifica que logs de evidencia foram criados
    const pastaLogs = join(projeto, "docs-mentor", ".evidencias", "logs");
    expect(existsSync(pastaLogs)).toBe(true);
  }, 25_000);

  it("G02-3: zero testes coletados reprova o gate de testes mesmo com exit code 0", () => {
    const caminhoCtx = join(projeto, "docs-mentor", "contexto.json");
    const ctx = JSON.parse(readFileSync(caminhoCtx, "utf8"));
    ctx.gates.testes = { comando: "node -e \"console.log('No tests found'); process.exit(0)\"" };
    writeFileSync(caminhoCtx, JSON.stringify(ctx, null, 2) + "\n", "utf8");

    const resTestes = mentorComStatus(projeto, "task", "gate", "TASK-CHORE-001", "testes");
    expect(resTestes.status).not.toBe(0);
    expect(resTestes.saida).toContain("INVÁLIDO como gate: testes");
    expect(resTestes.saida).toContain("Nenhum teste foi executado ou coletado");
  }, 25_000);
});

describe("Etapa 03: Identidade dos insumos e cache conservador de gates", () => {
  let projeto = "";

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-etapa03-cache-"));
    mentor(projeto, "init");
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    writeFileSync(join(projeto, "base.txt"), "base\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "chore: base");

    // Configura gates de teste no contexto
    const caminhoCtx = join(projeto, "docs-mentor", "contexto.json");
    const ctx = JSON.parse(readFileSync(caminhoCtx, "utf8"));
    ctx.gates = {
      tipos: { comando: 'node -e "process.exit(0)"' },
      testes: { comando: "node -e \"console.log('3 passed'); process.exit(0)\"" },
    };
    writeFileSync(caminhoCtx, JSON.stringify(ctx, null, 2) + "\n", "utf8");

    mentor(projeto, "task", "nova", "--tipo", "CHORE", "--titulo", "Teste Cache", "--esforco", "P/P", "--origem", "titulo-autossuficiente");
    mentor(projeto, "task", "puxar", "TASK-CHORE-001");
    mentor(projeto, "task", "iniciar", "TASK-CHORE-001");
  });

  afterAll(() => {
    if (projeto) rmSync(projeto, { recursive: true, force: true });
  });

  it("E03-1: executar gate duas vezes sem alteracoes reutiliza o resultado e nao causa invalidacao circular", () => {
    const primeira = mentorComStatus(projeto, "task", "gate", "TASK-CHORE-001", "tipos");
    expect(primeira.status).toBe(0);
    expect(primeira.saida).toContain("✓ APROVADO: tipos");
    expect(primeira.saida).not.toContain("[reutilizado]");

    const segunda = mentorComStatus(projeto, "task", "gate", "TASK-CHORE-001", "tipos");
    expect(segunda.status).toBe(0);
    expect(segunda.saida).toContain("✓ [reutilizado] APROVADO: tipos");

    // Com --forcar deve forcar reexecucao
    const comForcar = mentorComStatus(projeto, "task", "gate", "TASK-CHORE-001", "tipos", "--forcar");
    expect(comForcar.status).toBe(0);
    expect(comForcar.saida).not.toContain("[reutilizado]");
    expect(comForcar.saida).toContain("✓ APROVADO: tipos");
  }, 25_000);

  it("E03-2: mudar arquivo sob docs-mentor ou codigo invalida o cache", () => {
    // Garante que esta em cache
    mentor(projeto, "task", "gate", "TASK-CHORE-001", "tipos");

    // Cria/modifica arquivo de teste em docs-mentor/
    writeFileSync(join(projeto, "docs-mentor", "novo-teste.test.ts"), "// teste\n", "utf8");

    const aposMudanca = mentorComStatus(projeto, "task", "gate", "TASK-CHORE-001", "tipos");
    expect(aposMudanca.status).toBe(0);
    expect(aposMudanca.saida).not.toContain("[reutilizado]");
    expect(aposMudanca.saida).toContain("✓ APROVADO: tipos");

    // Limpa o arquivo de teste para outros testes
    rmSync(join(projeto, "docs-mentor", "novo-teste.test.ts"), { force: true });
  }, 25_000);

  it("E03-3: arquivos com acentos/espacos e staging parcial sao identificados e indice real fica intacto", () => {
    const arqComEspaco = join(projeto, "arquivo com acentuação e espaço.txt");
    writeFileSync(arqComEspaco, "conteudo\n", "utf8");
    git(projeto, "add", "arquivo com acentuação e espaço.txt");

    // Verifica que o staging area contem o arquivo
    const statusAntes = spawnSync("git", ["status", "--porcelain"], { cwd: projeto, encoding: "utf8" }).stdout ?? "";
    expect(statusAntes).toContain("arquivo com");

    const resGate = mentorComStatus(projeto, "task", "gate", "TASK-CHORE-001", "tipos");
    expect(resGate.status).toBe(0);

    // O status e staging area continuam intactos apos o gate
    const statusDepois = spawnSync("git", ["status", "--porcelain"], { cwd: projeto, encoding: "utf8" }).stdout ?? "";
    expect(statusDepois).toBe(statusAntes);

    // Limpa
    git(projeto, "reset", "HEAD", "arquivo com acentuação e espaço.txt");
    rmSync(arqComEspaco, { force: true });
  }, 25_000);

  it("E03-4: alterar prosa pura excluida nao invalida cache", () => {
    // Garante que tipos esta em cache
    mentor(projeto, "task", "gate", "TASK-CHORE-001", "tipos");

    // Modifica backlog.md (vista excluida)
    writeFileSync(join(projeto, "docs-mentor", "tarefas", "backlog.md"), "# Novo Backlog Derivado\n", "utf8");

    const resReuso = mentorComStatus(projeto, "task", "gate", "TASK-CHORE-001", "tipos");
    expect(resReuso.status).toBe(0);
    expect(resReuso.saida).toContain("[reutilizado]");
  }, 25_000);

  it("E03-5: artefato de log ausente impede reuso e explica por que", () => {
    // Garante que o gate tipos rodou e foi gravado
    mentor(projeto, "task", "gate", "TASK-CHORE-001", "tipos");

    // Localiza o log do gate tipos
    const camTarefa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-001.json");
    const t = JSON.parse(readFileSync(camTarefa, "utf8"));
    const logRef = t.gates.tipos.log_ref;
    expect(logRef).toBeDefined();

    // Apaga o log de evidencia
    rmSync(join(projeto, logRef), { force: true });

    const resSemLog = mentorComStatus(projeto, "task", "gate", "TASK-CHORE-001", "tipos");
    expect(resSemLog.status).toBe(0);
    expect(resSemLog.saida).toContain("artefato de log ausente");
    expect(resSemLog.saida).not.toContain("[reutilizado]");
  }, 25_000);
});

describe("Etapa 04: Push e PR verificam o conteudo certo", () => {
  let projeto = "";

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-etapa04-hooks-ci-"));
    mentor(projeto, "init");
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    mkdirSync(join(projeto, "src"), { recursive: true });
    writeFileSync(join(projeto, "src", "index.ts"), "export const a = 1;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "chore: base");

    // Configura gates no contexto
    const caminhoCtx = join(projeto, "docs-mentor", "contexto.json");
    const ctx = JSON.parse(readFileSync(caminhoCtx, "utf8"));
    ctx.gates = {
      tipos: { comando: 'node -e "process.exit(0)"' },
    };
    ctx.versionamento = {
      ramo_principal: "main",
      revisao_antes_do_merge: "PR obrigatorio no GitHub",
    };
    writeFileSync(caminhoCtx, JSON.stringify(ctx, null, 2) + "\n", "utf8");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "chore: configura gates e versionamento");
  });

  afterAll(() => {
    if (projeto) rmSync(projeto, { recursive: true, force: true });
  });

  it("C04-1: pre-push trata exclusao de ramo remoto e envio exclusivo de WIP sem executar gates", () => {
    // Exclusao de ramo remoto: shaLocal sao todos zeros
    const inputExclusao = "refs/heads/feature-antiga 0000000000000000000000000000000000000000 refs/heads/feature-antiga 1111111111111111111111111111111111111111\n";
    const resExclusao = mentorComInput(projeto, inputExclusao, "hooks", "--pre-push");
    expect(resExclusao.status).toBe(0);
    expect(resExclusao.saida).toContain("Exclusao de ramo remoto: sem gates");

    // Envio exclusivo para wip/: pula gates
    const inputWip = "refs/heads/wip/TASK-CHORE-001 1111111111111111111111111111111111111111 refs/heads/wip/TASK-CHORE-001 0000000000000000000000000000000000000000\n";
    const resWip = mentorComInput(projeto, inputWip, "hooks", "--pre-push");
    expect(resWip.status).toBe(0);
    expect(resWip.saida).toContain("Envio de WIP");
  }, 25_000);

  it("C04-1: pre-push barra envio direto ao main protegido antes de executar gates", () => {
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout.trim();
    const inputMain = `refs/heads/main ${head} refs/heads/main 0000000000000000000000000000000000000000\n`;
    const resMain = mentorComInput(projeto, inputMain, "hooks", "--pre-push");
    expect(resMain.status).not.toBe(0);
    expect(resMain.saida).toContain("Envio barrado: push direto no ramo principal");
  }, 25_000);

  it("C04-1: pre-push detecta working tree sujo em arquivo de codigo e barra", () => {
    // Modifica src/index.ts sem commitar
    writeFileSync(join(projeto, "src", "index.ts"), "export const a = 2;\n", "utf8");

    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projeto, encoding: "utf8" }).stdout.trim();
    const inputFeature = `refs/heads/feature-1 ${head} refs/heads/feature-1 0000000000000000000000000000000000000000\n`;
    const resSujo = mentorComInput(projeto, inputFeature, "hooks", "--pre-push");
    expect(resSujo.status).not.toBe(0);
    expect(resSujo.saida).toContain("working tree possui alteracoes nao commitadas em arquivos de codigo");

    // Restaura
    git(projeto, "checkout", "--", "src/index.ts");
  }, 25_000);

  it("C04-1: pre-push tolera commit enviado diferente do HEAD emitindo aviso e nao barra com erro", () => {
    const commitAnterior = spawnSync("git", ["rev-parse", "HEAD~1"], { cwd: projeto, encoding: "utf8" }).stdout.trim();

    // Envio de feature apontando para commit anterior enquanto HEAD está no commit atual
    const inputOutroCommit = `refs/heads/feature-antiga ${commitAnterior} refs/heads/feature-antiga 0000000000000000000000000000000000000000\n`;
    const resOutro = mentorComInput(projeto, inputOutroCommit, "hooks", "--pre-push");
    expect(resOutro.status).toBe(0);
    expect(resOutro.saida).toContain("difere do HEAD local");
    expect(resOutro.saida).not.toContain("Envio barrado: o commit enviado para");
  }, 25_000);

  it("C04-1: pre-push reconhece commit ativo em worktree secundario", () => {
    const pastaWorktree = mkdtempSync(join(tmpdir(), "mentor-wt-"));
    rmSync(pastaWorktree, { recursive: true, force: true });
    git(projeto, "branch", "ramo-wt");
    git(projeto, "worktree", "add", pastaWorktree, "ramo-wt");

    try {
      writeFileSync(join(pastaWorktree, "arquivo-wt.txt"), "wt\n", "utf8");
      git(pastaWorktree, "add", "arquivo-wt.txt");
      git(pastaWorktree, "commit", "-m", "chore: commit no worktree");

      const shaWt = spawnSync("git", ["rev-parse", "ramo-wt"], { cwd: projeto, encoding: "utf8" }).stdout.trim();
      const inputWt = `refs/heads/ramo-wt ${shaWt} refs/heads/ramo-wt 0000000000000000000000000000000000000000\n`;
      const resWt = mentorComInput(projeto, inputWt, "hooks", "--pre-push");
      expect(resWt.status).toBe(0);
      expect(resWt.saida).toContain("Envio de ramo em worktree");
    } finally {
      git(projeto, "worktree", "remove", "--force", pastaWorktree);
      git(projeto, "branch", "-D", "ramo-wt");
    }
  }, 25_000);

  it("C04-2: pronto-para-merge valida PR de plano com tarefa aberta e recusa tarefas com gates concluidos sob (plano)", () => {
    // Cria tarefa aberta
    mentor(projeto, "task", "nova", "--tipo", "CHORE", "--titulo", "Tarefa Planejada", "--esforco", "P/P", "--origem", "titulo-autossuficiente");

    // PR com (plano) citando tarefa aberta passa
    const resPlano = mentorComStatus(projeto, "pronto-para-merge", "--titulo", "docs(plano): planejar TASK-CHORE-001");
    expect(resPlano.status).toBe(0);
    expect(resPlano.saida).toContain("Pronto para merge: PR de planejamento (plano) validado");

    // PR de implementacao citando a mesma tarefa aberta falha
    const resImpl = mentorComStatus(projeto, "pronto-para-merge", "--titulo", "chore(TASK-CHORE-001): implementacao em andamento");
    expect(resImpl.status).not.toBe(0);
    expect(resImpl.saida).toContain('esta "aberta"');
  }, 25_000);

  it("C04-2: (light) nao permite alteracao em scripts protegidos ou workflows", () => {
    // Cria branch temporaria que toca arquivo em .mentor/
    git(projeto, "checkout", "-b", "light-invalido");
    mkdirSync(join(projeto, ".mentor", "scripts"), { recursive: true });
    writeFileSync(join(projeto, ".mentor", "scripts", "teste-patch.ts"), "// script\n", "utf8");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "fix(light): tenta burlar com script");

    const resLight = mentorComStatus(projeto, "pronto-para-merge", "--titulo", "fix(light): alteracao de teste", "--base", "main", "--head", "light-invalido");
    expect(resLight.status).not.toBe(0);
    expect(resLight.saida).toContain("PR marcado como (light) contem alteracoes em arquivos protegidos");

    git(projeto, "checkout", "main");
    git(projeto, "branch", "-D", "light-invalido");
  }, 25_000);

  it("C04-3: ref base inexistente falha fechado com mensagem explicita", () => {
    const resErroBase = mentorComStatus(projeto, "pronto-para-merge", "--titulo", "docs(plano): teste", "--base", "ref-totalmente-inexistente");
    expect(resErroBase.status).not.toBe(0);
    expect(resErroBase.saida).toContain("Falha ao resolver ref base");
  }, 25_000);
});

describe("Etapa 05: Consultas sem escrita e patches locais reconhecidos", () => {
  let projeto = "";

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-etapa05-patches-"));
    mentor(projeto, "init");
    mentor(projeto, "instalar", "--destino", projeto);
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    mkdirSync(join(projeto, "src"), { recursive: true });
    writeFileSync(join(projeto, "src", "index.ts"), "export const a = 1;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "chore: base");
  });

  afterAll(() => {
    if (projeto) rmSync(projeto, { recursive: true, force: true });
  });

  it("S05-1: doctor e verificar sao somente-leitura e nao alteram contexto.json nem lembretes", () => {
    const caminhoCtx = join(projeto, "docs-mentor", "contexto.json");
    const conteudoAntes = readFileSync(caminhoCtx, "utf8");

    // Executa doctor e verificar
    const resDoc = mentorComStatus(projeto, "doctor");
    expect(resDoc.status).toBe(0);

    mentorComStatus(projeto, "verificar");
    const conteudoDepois = readFileSync(caminhoCtx, "utf8");
    expect(conteudoDepois).toBe(conteudoAntes);
  }, 25_000);

  it("S05-2: geracao explicita com mentor gerar e idempotente", () => {
    mentor(projeto, "gerar");
    const caminhoCtx = join(projeto, "docs-mentor", "contexto.json");
    const caminhoBacklog = join(projeto, "docs-mentor", "tarefas", "backlog.md");
    const ctx1 = readFileSync(caminhoCtx, "utf8");
    const backlog1 = readFileSync(caminhoBacklog, "utf8");

    mentor(projeto, "gerar");
    const ctx2 = readFileSync(caminhoCtx, "utf8");
    const backlog2 = readFileSync(caminhoBacklog, "utf8");

    expect(ctx2).toBe(ctx1);
    expect(backlog2).toBe(backlog1);
  }, 25_000);

  it("S05-3: divergencia exata registrada e reconhecida; alterar alem do patch invalida", () => {
    // Cria manifesto inicial em .mentor/
    mentor(projeto, "manifesto");

    // Edita um arquivo em .mentor/
    const caminhoEntrega = join(projeto, ".mentor", "processos", "entrega.md");
    const original = readFileSync(caminhoEntrega, "utf8");
    writeFileSync(caminhoEntrega, original + "\n<!-- patch local 1 -->\n", "utf8");

    // Antes de registrar patch, verificar acusa divergencia
    const resVer1 = mentorComStatus(projeto, "verificar");
    expect(resVer1.saida).toContain("arquivo diverge do pacote sem patch registrado");

    // Registra o patch
    const resReg = mentorComStatus(projeto, "patch", "registrar", "processos/entrega.md", "--tarefa", "TASK-CHORE-001");
    expect(resReg.status).toBe(0);
    expect(resReg.saida).toContain("Patch registrado");

    // Agora o patch e reconhecido
    const resListar = mentorComStatus(projeto, "patch", "listar");
    expect(resListar.status).toBe(0);
    expect(resListar.saida).toContain("Patches Reconhecidos e Validos (1)");

    // Adiciona mais uma linha (divergencia alem do patch)
    writeFileSync(caminhoEntrega, original + "\n<!-- patch local 1 -->\n<!-- alteracao nao autorizada -->\n", "utf8");
    const resVer2 = mentorComStatus(projeto, "verificar");
    expect(resVer2.saida).toContain("alterado alem do patch registrado");

    // Restaura o arquivo
    writeFileSync(caminhoEntrega, original, "utf8");
  }, 25_000);
});

describe("Etapa 06: Processo compacto, migracao e piloto", () => {
  let projeto = "";

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-etapa06-processo-"));
    mentor(projeto, "init");
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    mkdirSync(join(projeto, "src"), { recursive: true });
    writeFileSync(join(projeto, "src", "index.ts"), "export const a = 1;\n");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "chore: base");

    // Configura gates no contexto
    const caminhoCtx = join(projeto, "docs-mentor", "contexto.json");
    const ctx = JSON.parse(readFileSync(caminhoCtx, "utf8"));
    ctx.qualidade = {
      ...(ctx.qualidade ?? {}),
      metodo_de_teste: "teste-depois",
    };
    ctx.gates = {
      tipos: { comando: 'node -e "process.exit(0)"' },
      testes: { comando: "node -e \"console.log('1 passed')\"" },
    };
    writeFileSync(caminhoCtx, JSON.stringify(ctx, null, 2) + "\n", "utf8");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "chore: gates configurados");
  });

  afterAll(() => {
    if (projeto) rmSync(projeto, { recursive: true, force: true });
  });

  it("F06-1: planejamento portatil importado/registrado e vinculado sem duplicar narrativa nem exigir nova autorizacao", () => {
    // Cria plano externo
    const planoExterno = join(projeto, "plano-externo.md");
    writeFileSync(planoExterno, "# Plano de Teste Portatil\n\n## 1. Escopo\nTeste portatil.\n", "utf8");

    // Registra plano
    const resReg = mentorComStatus(projeto, "plano", "registrar", "--arquivo", planoExterno, "--titulo", "Plano Externo");
    expect(resReg.status).toBe(0);

    // Cria tarefa e vincula plano
    mentor(projeto, "task", "nova", "--tipo", "CHORE", "--titulo", "Tarefa com Plano", "--esforco", "P/P", "--origem", "titulo-autossuficiente");
    mentor(projeto, "task", "puxar", "TASK-CHORE-001");
    const resVinc = mentorComStatus(projeto, "task", "vincular-plano", "TASK-CHORE-001", "--arquivo", planoExterno);
    expect(resVinc.status).toBe(0);

    // Inicia tarefa
    const resIniciar = mentorComStatus(projeto, "task", "iniciar", "TASK-CHORE-001");
    expect(resIniciar.status).toBe(0);

    // Verifica que narrativa referencia o plano sem duplicar
    const camNarrativa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-001.md");
    const narrativa = readFileSync(camNarrativa, "utf8");
    expect(narrativa).toContain("Plano de referencia: plano-externo.md");

    // Pausa para liberar o slot de execucao (WIP limit = 1)
    mentor(projeto, "task", "pausar", "TASK-CHORE-001", "--motivo", "pausa para liberar slot", "--commit");
  }, 25_000);

  it("F06-2: correcao localizada percorre Standard compacto e finaliza com evidencia sem exigir alternativas teatrais", () => {
    // Cria tarefa standard compacto
    const resNova = mentorComStatus(
      projeto,
      "task",
      "nova",
      "--tipo",
      "BG",
      "--titulo",
      "Correcao de Bug Pontual",
      "--esforco",
      "P/P",
      "--origem",
      "titulo-autossuficiente",
      "--cerimonia",
      "Standard",
      "--perfil",
      "compacto"
    );
    expect(resNova.status).toBe(0);

    // Puxa para o ciclo e inicia
    mentor(projeto, "task", "puxar", "TASK-BG-001");
    const resIniciar = mentorComStatus(projeto, "task", "iniciar", "TASK-BG-001");
    expect(resIniciar.status).toBe(0);

    // Modifica o arquivo no git
    writeFileSync(join(projeto, "src", "index.ts"), "export const a = 2;\n", "utf8");

    // Configura plano sem marcadores e sem alternativas_profissionais / discordancia
    const camTarefa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-BG-001.json");
    const t = JSON.parse(readFileSync(camTarefa, "utf8"));
    t.plano.muda = ["src/index.ts - corrige bug"];
    t.plano.criterios_aceite = [{ texto: "corrige bug", teste: 'node -e "process.exit(0)"' }];
    t.plano.impacto = "apenas local";
    t.plano.riscos = ["nenhum"];
    t.plano.solucao_sugerida = "ajuste pontual na condicao";
    // Nao preenche alternativas_profissionais nem problema_canonico nem discordancia
    writeFileSync(camTarefa, JSON.stringify(t, null, 2) + "\n", "utf8");

    // Limpa marcador na narrativa compacta
    const camNarrativa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-BG-001.md");
    const narr = readFileSync(camNarrativa, "utf8")
      .replace("PREENCHER: causa identificada e correcao aplicada", "bug corrigido na condicao")
      .replace(/PREENCHER: resultado da validacao[^\n]*/, "validado e gates concluidos");
    writeFileSync(camNarrativa, narr, "utf8");

    // Executa gates
    const resGates = mentorComStatus(projeto, "task", "gates", "TASK-BG-001");
    expect(resGates.status).toBe(0);

    // Finaliza com validacao dispensada (nao e sensivel)
    const resFin = mentorComStatus(projeto, "task", "finalizar", "TASK-BG-001", "--validacao-dispensada");
    expect(resFin.status).toBe(0);
    expect(resFin.saida).toContain("TASK-BG-001 concluida");

    // Commita para deixar tree limpa
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "fix(TASK-BG-001): concluida");
  }, 25_000);

  it("F06-3: mudanca sensivel de autorizacao ou gates exige motivo substancial de dispensa", () => {
    // Cria tarefa tocando gate/autorizacao no titulo
    mentor(
      projeto,
      "task",
      "nova",
      "--tipo",
      "CHORE",
      "--titulo",
      "Ajuste na autorizacao e seguranca",
      "--esforco",
      "P/P",
      "--origem",
      "titulo-autossuficiente",
      "--cerimonia",
      "Standard",
      "--perfil",
      "compacto"
    );
    mentor(projeto, "task", "puxar", "TASK-CHORE-002");
    mentor(projeto, "task", "iniciar", "TASK-CHORE-002");

    writeFileSync(join(projeto, "src", "index.ts"), "export const a = 3;\n", "utf8");

    const camTarefa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-002.json");
    const t = JSON.parse(readFileSync(camTarefa, "utf8"));
    t.plano.muda = ["src/index.ts - ajusta autorizacao"];
    t.plano.criterios_aceite = [{ texto: "valida autorizacao", teste: 'node -e "process.exit(0)"' }];
    t.plano.impacto = "seguranca de acesso";
    t.plano.riscos = ["risco de bypass"];
    writeFileSync(camTarefa, JSON.stringify(t, null, 2) + "\n", "utf8");

    const camNarrativa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-002.md");
    writeFileSync(
      camNarrativa,
      "# TASK-CHORE-002 · Teste Sensivel\n\n## Resumo da correcao\nCorrecao aplicada.\n\n## Aprendizados ou armadilhas\nNenhum.\n\n## Desfecho e Validacao Real\nValidado com sucesso nos testes automatizados e gates concluidos.\n",
      "utf8"
    );
    mentor(projeto, "task", "gates", "TASK-CHORE-002");

    // Tenta dispensar com motivo trivial (< 30 chars) -> deve falhar
    const resDispCurto = mentorComStatus(projeto, "task", "finalizar", "TASK-CHORE-002", "--validacao-dispensada", "--motivo", "curto");
    expect(resDispCurto.status).not.toBe(0);
    expect(resDispCurto.saida).toContain("Dispensar validacao em tarefa sensivel");

    // Com motivo substantivo (>= 30 chars) -> deve aceitar
    const resDispLongo = mentorComStatus(
      projeto,
      "task",
      "finalizar",
      "TASK-CHORE-002",
      "--validacao-dispensada",
      "--motivo",
      "Validacao manual dispensada porque a mudanca foi verificada por testes automatizados do hook"
    );
    expect(resDispLongo.status).toBe(0);

    // Commita para deixar tree limpa
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "chore(TASK-CHORE-002): concluida");
  }, 25_000);

  it("F06-4: tarefas legadas e novas coexistem sem alteracao historica", () => {
    // Verifica que tarefas concluidas no projeto coexistem normalmente
    const resGerar = mentorComStatus(projeto, "gerar");
    expect(resGerar.status).toBe(0);

    const resDoctor = mentorComStatus(projeto, "doctor");
    expect(resDoctor.status).toBe(0);
  }, 25_000);

  it("F06-5: desligamento de cache via MENTOR_SEM_CACHE=1 forca execucao completa", () => {
    mentor(projeto, "task", "nova", "--tipo", "CHORE", "--titulo", "Tarefa para teste de cache desligado", "--esforco", "P/P", "--origem", "titulo-autossuficiente");
    mentor(projeto, "task", "puxar", "TASK-CHORE-003");
    mentor(projeto, "task", "iniciar", "TASK-CHORE-003");

    // Executa tipos uma vez para gerar registro
    mentor(projeto, "task", "gate", "TASK-CHORE-003", "tipos");

    // Executa com MENTOR_SEM_CACHE=1
    const resSemCache = spawnSync(process.execPath, [join(RAIZ, "mentor.mjs"), "task", "gate", "TASK-CHORE-003", "tipos"], {
      cwd: RAIZ,
      encoding: "utf8",
      env: { ...process.env, MENTOR_RAIZ: projeto, MENTOR_SEM_CACHE: "1" },
    });
    expect(resSemCache.status).toBe(0);
    expect(resSemCache.stdout).not.toContain("[reutilizado]");
  }, 25_000);
});

describe("F07: secao de desfecho obrigatoria na narrativa de estudo humano (TASK-CHORE-028)", () => {
  let projeto = "";

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-desfecho-estudo-"));
    mentor(projeto, "init");
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "docs: estado inicial");

    mentor(projeto, "task", "nova", "--tipo", "CHORE", "--titulo", "Teste trava desfecho", "--esforco", "P/P", "--origem", "titulo-autossuficiente", "--cerimonia", "Standard", "--perfil", "compacto");
    mentor(projeto, "task", "puxar", "TASK-CHORE-001");
    mentor(projeto, "task", "iniciar", "TASK-CHORE-001");

    const camTarefa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-001.json");
    const t = JSON.parse(readFileSync(camTarefa, "utf8"));
    t.plano.muda = ["docs-mentor/tarefas/abertas/TASK-CHORE-001.md - teste"];
    t.plano.criterios_aceite = [{ texto: "crit 1", teste: 'node -e "process.exit(0)"' }];
    t.plano.impacto = "nenhum";
    t.plano.riscos = ["nenhum"];
    writeFileSync(camTarefa, JSON.stringify(t, null, 2) + "\n", "utf8");
    mentor(projeto, "task", "gates", "TASK-CHORE-001");
  });

  afterAll(() => {
    try {
      rmSync(projeto, { recursive: true, force: true });
    } catch {
      // noop
    }
  });

  it("F07-1: recusa finalizar se a narrativa nao contiver a secao Desfecho", () => {
    const camNarrativa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-001.md");
    // Narrativa sem a secao Desfecho
    writeFileSync(camNarrativa, "# TASK-CHORE-001 · Teste trava desfecho\n\n## Resumo da correcao\nCausa identificada.\n\n## Aprendizados ou armadilhas\nNenhum.\n", "utf8");

    const resSemDesfecho = mentorComStatus(projeto, "task", "finalizar", "TASK-CHORE-001", "--validacao-dispensada");
    expect(resSemDesfecho.status).not.toBe(0);
    expect(resSemDesfecho.saida).toContain("A narrativa da tarefa ainda nao contem a secao '## Desfecho'");
  }, 25_000);

  it("F07-2: recusa finalizar se a secao Desfecho estiver vazia", () => {
    const camNarrativa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-001.md");
    writeFileSync(camNarrativa, "# TASK-CHORE-001 · Teste trava desfecho\n\n## Resumo da correcao\nCausa identificada.\n\n## Aprendizados ou armadilhas\nNenhum.\n\n## Desfecho\n", "utf8");

    const resDesfechoVazio = mentorComStatus(projeto, "task", "finalizar", "TASK-CHORE-001", "--validacao-dispensada");
    expect(resDesfechoVazio.status).not.toBe(0);
    expect(resDesfechoVazio.saida).toContain("A secao '## Desfecho' da narrativa esta vazia");
  }, 25_000);

  it("F07-3: finaliza com sucesso quando Desfecho e Validacao Real esta preenchida e gera arquivo de estudo humano", () => {
    const camNarrativa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-001.md");
    writeFileSync(
      camNarrativa,
      "# TASK-CHORE-001 · Teste trava desfecho\n\n## Resumo da correcao\nCausa identificada.\n\n## Aprendizados ou armadilhas\nNenhum.\n\n## Desfecho e Validacao Real\nComportamento validado nos testes unitarios. Sem armadilhas identificadas. Gates concluidos com sucesso.\n",
      "utf8"
    );

    const resSucesso = mentorComStatus(projeto, "task", "finalizar", "TASK-CHORE-001", "--validacao-dispensada");
    expect(resSucesso.status).toBe(0);
    expect(resSucesso.saida).toContain("TASK-CHORE-001 concluida");

    // Verifica que o arquivo final foi salvo em concluidas com o sufixo --estudo-humano.md
    const concluidas = join(projeto, "docs-mentor", "tarefas", "concluidas");
    const arquivosConcluidos = readdirSync(concluidas);
    const estudoHumano = arquivosConcluidos.find((f) => f.includes("TASK-CHORE-001") && f.endsWith("--estudo-humano.md"));
    expect(estudoHumano).toBeDefined();

    const conteudoEstudo = readFileSync(join(concluidas, estudoHumano!), "utf8");
    expect(conteudoEstudo).toContain("## Desfecho e Validacao Real");
    expect(conteudoEstudo).toContain("Comportamento validado nos testes unitarios");
  }, 25_000);
});

describe("F08: vincular plano em diretorio nao lanca EISDIR (TASK-RF-051)", () => {
  let projeto = "";

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-plano-dir-"));
    mentor(projeto, "init");
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "docs: estado inicial");
  });

  afterAll(() => {
    try {
      rmSync(projeto, { recursive: true, force: true });
    } catch {
      // noop
    }
  });

  it("F08-1: vincular plano apontando para diretorio resolve sem erro EISDIR", () => {
    const pastaPlano = join(projeto, "docs-mentor", "rascunhos", "planejamento-teste");
    mkdirSync(pastaPlano, { recursive: true });
    writeFileSync(join(pastaPlano, "README.md"), "# Visao Geral\n", "utf8");

    mentor(projeto, "task", "nova", "--tipo", "CHORE", "--titulo", "Teste plano dir", "--esforco", "P/P", "--origem", "titulo-autossuficiente");
    const resVincular = mentorComStatus(projeto, "task", "vincular-plano", "TASK-CHORE-001", "--arquivo", "docs-mentor/rascunhos/planejamento-teste");
    expect(resVincular.status).toBe(0);
    expect(resVincular.saida).toContain("vinculada ao plano");
  }, 25_000);
});

describe("F09: preservacao integral do implementation_plan na narrativa e estudo humano", () => {
  let projeto = "";

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-plano-narrativa-"));
    mentor(projeto, "init");
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");

    // No piloto, copiava-se o registro de patches e os tetos de la'. Aqui o pacote instalado e' o
    // proprio pacote: nao ha' patch a reconhecer.

    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "docs: estado inicial");
  });

  afterAll(() => {
    try {
      rmSync(projeto, { recursive: true, force: true });
    } catch {
      // noop
    }
  });

  it("F09-1: link markdown bruto file:/// reprova no verificar com 'link nao resolve'", () => {
    mentor(projeto, "task", "nova", "--tipo", "CHORE", "--titulo", "Teste link bruto", "--esforco", "P/P", "--origem", "titulo-autossuficiente", "--cerimonia", "Standard", "--perfil", "compacto");
    mentor(projeto, "task", "puxar", "TASK-CHORE-001");
    mentor(projeto, "task", "iniciar", "TASK-CHORE-001");

    const camTarefa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-001.json");
    const t = JSON.parse(readFileSync(camTarefa, "utf8"));
    t.plano.muda = ["docs-mentor/tarefas/abertas/TASK-CHORE-001.md - teste de link"];
    t.plano.criterios_aceite = [{ texto: "criterio 1", teste: 'node -e "process.exit(0)"' }];
    t.plano.impacto = "nenhum";
    t.plano.riscos = ["nenhum"];
    writeFileSync(camTarefa, JSON.stringify(t, null, 2) + "\n", "utf8");

    const camNarrativa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-001.md");
    writeFileSync(
      camNarrativa,
      "# TASK-CHORE-001 · Teste link bruto\n\n## Plano\nVeja [arquivo](file:///C:/Users/thiag/repos/src/index.ts) para detalhes.\n\n## Desfecho e Validacao Real\nValidado sem ressalvas.\n",
      "utf8"
    );

    const resVerificar = mentorComStatus(projeto, "verificar");
    expect(resVerificar.status).not.toBe(0);
    expect(resVerificar.saida).toContain('link "file:///C:/Users/thiag/repos/src/index.ts" nao resolve');
  }, 25_000);

  it("F09-2: narrativa com plano tecnico integral e links normalizados em backtick aprova no verificar e e preservada em estudo humano", () => {
    const camNarrativa = join(projeto, "docs-mentor", "tarefas", "abertas", "TASK-CHORE-001.md");
    const planoTecnicoIntegral = [
      "# TASK-CHORE-001 · Teste link bruto",
      "",
      "## Proposed Changes",
      "",
      "### Componente Central",
      "",
      "#### [MODIFY] `src/index.ts`",
      "- Implementar parser de romaneio bruto",
      "- Adicionar selecao de ponto inicial",
      "",
      "## Verification Plan",
      "- Teste unitario: `npm run test:lab`",
      "",
      "## Desfecho e Validacao Real",
      "Comportamento real observado nos testes manuais: importacao validada com sucesso, pin #1 verde e sem regressoes.",
    ].join("\n");

    writeFileSync(camNarrativa, planoTecnicoIntegral, "utf8");

    const resVerificar = mentorComStatus(projeto, "verificar");
    expect(resVerificar.status, resVerificar.saida).toBe(0);
    expect(resVerificar.saida).toContain("APROVADO");

    const resFinalizar = mentorComStatus(projeto, "task", "finalizar", "TASK-CHORE-001", "--validacao-dispensada");
    expect(resFinalizar.status, resFinalizar.saida).toBe(0);

    const concluidas = join(projeto, "docs-mentor", "tarefas", "concluidas");
    const arqs = readdirSync(concluidas);
    const estudoHumano = arqs.find((f) => f.includes("TASK-CHORE-001") && f.endsWith("--estudo-humano.md"));
    expect(estudoHumano).toBeDefined();

    const conteudoEstudo = readFileSync(join(concluidas, estudoHumano!), "utf8");
    expect(conteudoEstudo).toContain("#### [MODIFY] `src/index.ts`");
    expect(conteudoEstudo).toContain("- Implementar parser de romaneio bruto");
    expect(conteudoEstudo).toContain("## Desfecho e Validacao Real");
  }, 25_000);
});

describe("F12: finalizar coordenadora de épico pelas fatias diretas (TASK-CHORE-037)", () => {
  let projeto = "";
  const abertas = () => join(projeto, "docs-mentor", "tarefas", "abertas");
  const concluidas = () => join(projeto, "docs-mentor", "tarefas", "concluidas");
  const ler = (id: string) => JSON.parse(readFileSync(join(abertas(), `${id}.json`), "utf8"));
  const gravar = (t: Record<string, unknown>) => writeFileSync(join(abertas(), `${t.id}.json`), JSON.stringify(t, null, 2) + "\n", "utf8");
  const narrar = (id: string, desfecho: string | null) =>
    writeFileSync(
      join(abertas(), `${id}.md`),
      `# ${id} · Coordenadora\n\n## Reconciliação\nFatias executadas separadamente.\n${desfecho === null ? "" : `\n## Desfecho e Validação Real\n${desfecho}\n`}`,
      "utf8"
    );
  /** Conclusao simulada: a fatia ja' passou pelo proprio finalizar, que nao e' o objeto deste teste. */
  const concluirFatia = (id: string) => {
    const t = ler(id);
    t.estado = "concluida";
    t.concluida_em = "30/09/26 10:00";
    writeFileSync(join(concluidas(), `2026-09-30--10h00--${id}.json`), JSON.stringify(t, null, 2) + "\n", "utf8");
    rmSync(join(abertas(), `${id}.json`));
  };

  beforeAll(() => {
    projeto = mkdtempSync(join(tmpdir(), "mentor-coordenadora-"));
    mentor(projeto, "init");
    git(projeto, "init", "-b", "main");
    git(projeto, "config", "user.name", "Teste Mentor");
    git(projeto, "config", "user.email", "teste@mentor.invalid");
    git(projeto, "add", ".");
    git(projeto, "commit", "-m", "docs: estado inicial");
    const nova = (titulo: string) => mentor(projeto, "task", "nova", "--tipo", "CHORE", "--titulo", titulo, "--esforco", "P/XG", "--origem", "titulo-autossuficiente", "--cerimonia", "Standard");
    nova("Coordenadora do teste");
    mentor(projeto, "task", "fatiar", "TASK-CHORE-001", "--titulos", "Primeira fatia|Segunda fatia|Terceira fatia");
    nova("Tarefa comum com plano de epico e sem fatias");
    nova("Tarefa comum apontada como pai sem plano de epico");
    nova("Fatia avulsa");
    const avulsa = ler("TASK-CHORE-007");
    avulsa.fatia_de = "TASK-CHORE-006";
    gravar(avulsa);
    const semFatias = ler("TASK-CHORE-005");
    semFatias.plano_do_epico = ler("TASK-CHORE-001").plano_do_epico;
    gravar(semFatias);
  });

  afterAll(() => {
    try {
      rmSync(projeto, { recursive: true, force: true });
    } catch {
      // noop
    }
  });

  it("F12-1: sem plano_do_epico ou sem fatia direta, a tarefa segue o fechamento normal", () => {
    for (const id of ["TASK-CHORE-005", "TASK-CHORE-006"]) {
      narrar(id, "Nada executado.");
      const r = mentorComStatus(projeto, "task", "finalizar", id);
      expect(r.status).not.toBe(0);
      expect(r.saida).toContain('nao "em-execucao"');
      expect(r.saida).not.toContain("coordenadora");
    }
  }, 25_000);

  it("F12-2: fatia viva bloqueia e a recusa nomeia a fatia", () => {
    narrar("TASK-CHORE-001", "Fatias entregues.");
    concluirFatia("TASK-CHORE-002");
    const r = mentorComStatus(projeto, "task", "finalizar", "TASK-CHORE-001");
    expect(r.status).not.toBe(0);
    expect(r.saida).toContain('fatia TASK-CHORE-003 ainda esta "aberta"');
    expect(r.saida).toContain('fatia TASK-CHORE-004 ainda esta "aberta"');
    expect(r.saida).not.toContain("em-execucao");
    expect(r.saida).not.toContain("gate");
  }, 25_000);

  it("F12-3: cancelada ou absorvida exige o ID no Desfecho; Desfecho e composição são obrigatórios", () => {
    mentor(projeto, "task", "cancelar", "TASK-CHORE-003", "--motivo", "Escopo deixou de ser necessário no teste");
    mentor(projeto, "task", "absorver", "TASK-CHORE-004", "--por", "TASK-CHORE-002");

    narrar("TASK-CHORE-001", null);
    let r = mentorComStatus(projeto, "task", "finalizar", "TASK-CHORE-001");
    expect(r.status).not.toBe(0);
    expect(r.saida).toContain("ainda nao contem a secao '## Desfecho'");

    narrar("TASK-CHORE-001", "A TASK-CHORE-002 entregou o escopo.");
    r = mentorComStatus(projeto, "task", "finalizar", "TASK-CHORE-001");
    expect(r.status).not.toBe(0);
    expect(r.saida).toContain("fatia TASK-CHORE-003 foi cancelada: cite TASK-CHORE-003 no Desfecho");
    expect(r.saida).toContain("fatia TASK-CHORE-004 foi absorvida por TASK-CHORE-002");

    const pai = ler("TASK-CHORE-001");
    pai.fatia_de = "TASK-CHORE-099";
    gravar(pai);
    narrar("TASK-CHORE-001", "TASK-CHORE-002 entregou. TASK-CHORE-003 foi cancelada por perder o motivo. TASK-CHORE-004 foi absorvida pela TASK-CHORE-002.");
    r = mentorComStatus(projeto, "task", "finalizar", "TASK-CHORE-001");
    expect(r.status).not.toBe(0);
    expect(r.saida).toContain('plano nao contem secao "composicao"');
    pai.fatia_de = null;
    gravar(pai);
  }, 25_000);

  it("F12-4: fecha sem estado em execução, gates, commit_base ou diff e promove a narrativa", () => {
    const pai = ler("TASK-CHORE-001");
    expect(pai.estado).toBe("aberta");
    expect(pai.commit_base).toBeNull();
    expect(pai.gates).toEqual({});

    const r = mentorComStatus(projeto, "task", "finalizar", "TASK-CHORE-001");
    expect(r.status).toBe(0);
    expect(r.saida).toContain("TASK-CHORE-001 concluida como coordenadora de 3 fatia(s)");
    expect(existsSync(join(abertas(), "TASK-CHORE-001.json"))).toBe(false);
    const estudo = readdirSync(concluidas()).find((f) => f.includes("TASK-CHORE-001") && f.endsWith("--estudo-humano.md"));
    expect(estudo).toBeDefined();
    expect(readFileSync(join(concluidas(), estudo!), "utf8")).toContain("TASK-CHORE-003 foi cancelada");
  }, 25_000);
});
