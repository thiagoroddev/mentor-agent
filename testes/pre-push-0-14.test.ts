import { spawnSync } from 'node:child_process'
import { closeSync, mkdtempSync, openSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from './vitest-local.ts'
import { arquivoEhCodigo } from '../.mentor/scripts/cmd-hooks.ts'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cli = join(raiz, 'mentor.mjs')

describe('CHORE-039: midia estatica e protocolo de stdin do pre-push', () => {
  let projeto: string
  beforeAll(() => { projeto = mkdtempSync(join(tmpdir(), 'mentor-prepush-039-')) })
  afterAll(() => { rmSync(projeto, { recursive: true, force: true }) })

  const ambiente = () => ({ ...process.env, MENTOR_RAIZ: projeto, MENTOR_HOOKS_STDIN: '' })
  const excluir = 'refs/heads/apagado ' + '0'.repeat(40) + ' refs/heads/apagado ' + '1'.repeat(40) + '\n'
  const executar = (args: string[], env = ambiente()) => spawnSync(
    process.execPath, [cli, 'hooks', '--pre-push', ...args],
    { cwd: raiz, encoding: 'utf8', input: excluir, env, timeout: 10_000 },
  )

  it('classifica midia/documentos estaticos sem dispensar fontes, testes e configuracoes', () => {
    for (const arquivo of ['public/logo.png', 'src/foto.jpg', 'docs/mapa.svg', 'docs/manual.pdf', 'lab/print.webp', 'lab/video.mp4', 'lab/som.wav', 'lab\\print.png']) {
      expect(arquivoEhCodigo(arquivo), arquivo).toBe(false)
    }
    for (const arquivo of ['src/app.ts', 'src/tela.tsx', 'src/index.js', 'docs-mentor/caso.test.ts', 'laboratorio/package.json']) {
      expect(arquivoEhCodigo(arquivo), arquivo).toBe(true)
    }
  })

  it('chamada manual termina com o pipe de stdin mantido aberto', () => {
    const programa = `
      const {spawn} = require('node:child_process');
      const filho = spawn(process.execPath, [process.env.MENTOR_TEST_CLI, 'hooks', '--pre-push'], {
        cwd: process.env.MENTOR_TEST_RAIZ,
        env: process.env, stdio: ['pipe', 'pipe', 'pipe']
      });
      let expirou = false;
      let saida = '';
      filho.stdout.on('data', d => saida += d);
      filho.stderr.on('data', d => saida += d);
      const limite = setTimeout(() => { expirou = true; filho.kill(); }, 3000);
      filho.on('error', e => { clearTimeout(limite); console.error(e); process.exitCode = 1; });
      filho.on('close', (codigo, sinal) => {
        clearTimeout(limite);
        console.log(JSON.stringify({expirou, codigo, sinal, saida}));
        process.exitCode = !expirou && codigo === 0 ? 0 : 1;
      });
      // Nao fecha filho.stdin: reproduz terminal/background sem EOF.
    `
    const resultado = spawnSync(process.execPath, ['-e', programa], {
      cwd: raiz, encoding: 'utf8', timeout: 10_000,
      env: { ...ambiente(), MENTOR_TEST_CLI: cli, MENTOR_TEST_RAIZ: raiz },
    })
    expect(resultado.error).toBeUndefined()
    expect(resultado.status, resultado.stdout + resultado.stderr).toBe(0)
    const dados = JSON.parse(resultado.stdout.trim())
    expect(dados.expirou).toBe(false)
    expect(dados.codigo).toBe(0)
  })

  it('argumentos do Git leem os refs enviados e reconhecem exclusao', () => {
    const resultado = executar(['origin', 'https://example.invalid/mentor.git'])
    expect(resultado.error).toBeUndefined()
    expect(resultado.status, resultado.stdout + resultado.stderr).toBe(0)
    expect(resultado.stdout).toContain('Exclusao de ramo remoto')
  })

  it('opt-in --stdin preserva o protocolo em chamada explicita', () => {
    const resultado = executar(['--stdin'])
    expect(resultado.error).toBeUndefined()
    expect(resultado.status, resultado.stdout + resultado.stderr).toBe(0)
    expect(resultado.stdout).toContain('Exclusao de ramo remoto')
  })

  it('opt-in por ambiente preserva o protocolo', () => {
    const resultado = executar([], { ...ambiente(), MENTOR_HOOKS_STDIN: '1' })
    expect(resultado.status, resultado.stdout + resultado.stderr).toBe(0)
    expect(resultado.stdout).toContain('Exclusao de ramo remoto')
  })

  it('redirecionamento de arquivo com dados prontos preserva leitura', () => {
    const entrada = join(projeto, 'refs.txt')
    writeFileSync(entrada, excluir)
    const fd = openSync(entrada, 'r')
    try {
      const resultado = spawnSync(process.execPath, [cli, 'hooks', '--pre-push'], {
        cwd: raiz, encoding: 'utf8', timeout: 10_000, env: ambiente(), stdio: [fd, 'pipe', 'pipe'],
      })
      expect(resultado.status, resultado.stdout + resultado.stderr).toBe(0)
      expect(resultado.stdout).toContain('Exclusao de ramo remoto')
    } finally { closeSync(fd) }
  })
})
