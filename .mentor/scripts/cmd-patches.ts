import { join } from 'node:path'
import { agora, caminhos, escreverJson, existe, lerJson, lerTexto } from './arquivos.ts'
import { conferirManifesto, hashDe } from './cmd-pacote.ts'
import type { Manifesto } from './cmd-pacote.ts'

export interface PatchRegistrado {
  arquivo: string
  versao_base: string
  digest_base: string | null
  digest_local: string
  tarefa_ref: string
  evidencia_teste?: string | null
  registrado_em?: string | null
}

export interface RegistroPatches {
  versao_pacote: string
  patches: PatchRegistrado[]
}

export function carregarPatches(): RegistroPatches | null {
  const c = caminhos()
  if (!existe(c.patches)) return null
  try {
    return lerJson<RegistroPatches>(c.patches)
  } catch {
    return null
  }
}

export function salvarPatches(registro: RegistroPatches): void {
  const c = caminhos()
  escreverJson(c.patches, registro)
}

function normalizarCaminho(caminhoInput: string): string {
  let norm = caminhoInput.replace(/\\/g, '/').replace(/^\.\//, '')
  if (norm.startsWith('.mentor/')) norm = norm.slice('.mentor/'.length)
  return norm
}

export function registrarPatch(arquivoInput: string, flags: { tarefa?: string; teste?: string }): number {
  if (!flags.tarefa?.trim()) {
    console.error('Falta --tarefa <ID da tarefa ou justificativa>. Ex: mentor patch registrar scripts/cmd-merge.ts --tarefa TASK-CHORE-001')
    return 1
  }

  const c = caminhos()
  const rel = normalizarCaminho(arquivoInput)
  const abs = join(c.pacote, rel)

  if (!existe(abs)) {
    console.error(`Arquivo nao encontrado em .mentor/${rel}`)
    return 1
  }

  const manifestoPath = join(c.pacote, 'manifesto.json')
  if (!existe(manifestoPath)) {
    console.error('Manifesto .mentor/manifesto.json nao encontrado.')
    return 1
  }

  const manifesto = lerJson<Manifesto>(manifestoPath)
  const digestBase = manifesto.arquivos[rel] ?? null
  const digestLocal = hashDe(lerTexto(abs))

  if (digestBase && digestBase === digestLocal) {
    console.error(`O arquivo .mentor/${rel} e identico ao original da versao ${manifesto.versao}. Nao ha patch a registrar.`)
    return 1
  }

  let registro = carregarPatches()
  if (!registro) {
    registro = {
      versao_pacote: manifesto.versao,
      patches: [],
    }
  }

  const patchIndex = registro.patches.findIndex((p) => p.arquivo === rel)
  const novoPatch: PatchRegistrado = {
    arquivo: rel,
    versao_base: manifesto.versao,
    digest_base: digestBase,
    digest_local: digestLocal,
    tarefa_ref: flags.tarefa.trim(),
    evidencia_teste: flags.teste?.trim() ?? null,
    registrado_em: agora().log,
  }

  if (patchIndex >= 0) {
    registro.patches[patchIndex] = novoPatch
  } else {
    registro.patches.push(novoPatch)
  }

  salvarPatches(registro)
  console.log(`✓ Patch registrado em docs-mentor/patches-do-pacote.json para .mentor/${rel} (${novoPatch.tarefa_ref}).`)
  return 0
}

export function registrarTodosPatches(flags: { tarefa?: string; teste?: string }): number {
  if (!flags.tarefa?.trim()) {
    console.error('Falta --tarefa <ID da tarefa ou justificativa>.')
    return 1
  }

  const d = conferirManifesto()
  if (!d) {
    console.error('Nao foi possivel conferir manifesto do pacote.')
    return 1
  }

  const alvos = [...d.mudados, ...d.acrescentados]
  if (alvos.length === 0) {
    console.log('Nenhum arquivo divergente do manifesto encontrado em .mentor/.')
    return 0
  }

  for (const arq of alvos) {
    registrarPatch(arq, flags)
  }

  console.log(`\nRegistrados ${alvos.length} patches locais com sucesso.`)
  return 0
}

export interface StatusIntegridadePatches {
  versao_base: string
  reconhecidos: PatchRegistrado[]
  divergentes: Array<{ patch: PatchRegistrado; digest_atual: string }>
  incorporados: PatchRegistrado[]
  nao_registrados: string[]
  faltando: string[]
}

export function conferirIntegridadePatches(): StatusIntegridadePatches {
  const c = caminhos()
  const d = conferirManifesto()
  const registro = carregarPatches()
  const versaoBase = d?.versao ?? registro?.versao_pacote ?? 'desconhecida'

  const mapaPatches = new Map<string, PatchRegistrado>()
  for (const p of registro?.patches ?? []) {
    mapaPatches.set(p.arquivo, p)
  }

  const reconhecidos: PatchRegistrado[] = []
  const divergentes: Array<{ patch: PatchRegistrado; digest_atual: string }> = []
  const incorporados: PatchRegistrado[] = []
  const naoRegistrados: string[] = []

  const divergencias = [...(d?.mudados ?? []), ...(d?.acrescentados ?? [])]
  const arquivosVistos = new Set<string>()

  for (const arq of divergencias) {
    arquivosVistos.add(arq)
    const patch = mapaPatches.get(arq)
    const abs = join(c.pacote, arq)
    const hashAtual = existe(abs) ? hashDe(lerTexto(abs)) : null

    if (!patch) {
      naoRegistrados.push(arq)
      continue
    }

    if (hashAtual === patch.digest_local) {
      reconhecidos.push(patch)
    } else if (patch.digest_base && hashAtual === patch.digest_base) {
      incorporados.push(patch)
    } else {
      divergentes.push({ patch, digest_atual: hashAtual ?? '(ausente)' })
    }
  }

  for (const [arq, patch] of mapaPatches) {
    if (!arquivosVistos.has(arq)) {
      const abs = join(c.pacote, arq)
      const hashAtual = existe(abs) ? hashDe(lerTexto(abs)) : null
      if (patch.digest_base && hashAtual === patch.digest_base) {
        incorporados.push(patch)
      }
    }
  }

  return {
    versao_base: versaoBase,
    reconhecidos,
    divergentes,
    incorporados,
    nao_registrados: naoRegistrados,
    faltando: d?.faltando ?? [],
  }
}

export function listarPatches(): number {
  const s = conferirIntegridadePatches()
  console.log(`\nPatches locais do pacote .mentor/ (versao base ${s.versao_base}):\n`)

  if (s.reconhecidos.length === 0 && s.divergentes.length === 0 && s.nao_registrados.length === 0 && s.incorporados.length === 0) {
    console.log('Nenhum patch local registrado e nenhuma divergencia do pacote detectada.')
    return 0
  }

  if (s.reconhecidos.length > 0) {
    console.log(`Patches Reconhecidos e Validos (${s.reconhecidos.length}):`)
    for (const p of s.reconhecidos) {
      const testeInfo = p.evidencia_teste ? ` [teste: ${p.evidencia_teste}]` : ''
      console.log(`  ✓ .mentor/${p.arquivo} (${p.tarefa_ref})${testeInfo} - hash: ${p.digest_local}`)
    }
    console.log('')
  }

  if (s.incorporados.length > 0) {
    console.log(`Patches Incorporados Upstream (${s.incorporados.length}):`)
    for (const p of s.incorporados) {
      console.log(`  · .mentor/${p.arquivo} (${p.tarefa_ref}) - o arquivo local agora coincide com a base upstream.`)
    }
    console.log('')
  }

  if (s.divergentes.length > 0) {
    console.error(`Patches com Modificacao Alem do Registrado (${s.divergentes.length}):`)
    for (const d of s.divergentes) {
      console.error(`  ✗ .mentor/${d.patch.arquivo}: hash atual (${d.digest_atual}) difere do registrado (${d.patch.digest_local}). Atualize o registro com: mentor patch registrar ${d.patch.arquivo} --tarefa ${d.patch.tarefa_ref}`)
    }
    console.error('')
  }

  if (s.nao_registrados.length > 0) {
    console.error(`Arquivos Modificados Sem Registro de Patch (${s.nao_registrados.length}):`)
    for (const a of s.nao_registrados) {
      console.error(`  ! .mentor/${a}: modificado em relacao ao pacote. Registre com: mentor patch registrar ${a} --tarefa <ID>`)
    }
    console.error('')
  }

  return s.divergentes.length === 0 && s.nao_registrados.length === 0 ? 0 : 1
}
