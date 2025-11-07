import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdtempDisposable, readFile } from 'node:fs/promises'

import * as core from '@actions/core'
import * as exec from '@actions/exec'

export async function runTests(): Promise<string> {
  core.debug('Running tests with Jest ...')

  try {
    // Log the current timestamp, wait, then log the new timestamp
    core.debug(new Date().toTimeString())
    await using jestOutputDir = await mkdtempDisposable(
      join(tmpdir(), 'jest-output-')
    )
    const jestOutputFile = join(jestOutputDir.path, 'jest-output.json')

    core.debug(`Using temporary directory: ${jestOutputDir.path}`)
    await exec.exec(
      'npm',
      [
        'run',
        'test',
        '--',
        '--json',
        '--no-color',
        '--no-coverage',
        '--no-watch',
        '--noStackTrace',
        `--outputFile=${jestOutputFile}`,
        '--silent'
      ],
      {
        ignoreReturnCode: true
      }
    )
    const output = await readFile(jestOutputFile, { encoding: 'utf-8' })
    core.debug(new Date().toTimeString())
    return output
  } catch (error) {
    core.debug('Error during test execution:')
    if (error instanceof Error) {
      core.debug(error.message)
    }
    throw error
  }
}
