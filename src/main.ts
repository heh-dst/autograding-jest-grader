import type {
  AssertionResult,
  FormattedTestResults,
  ResultType,
  TestResult,
  TestType
} from './types.ts'

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { runTests } from './runner.js'

async function runSetupCommandIfProvided(): Promise<number> {
  const setupCommand: string = core.getInput('setup-command')
  if (setupCommand) {
    core.debug(`Executing setup command: ${setupCommand} ...`)
    return exec.exec(setupCommand)
  } else {
    core.debug('No setup command provided, executing default: npm install ...')
    return exec.exec('npm', ['install'], {})
  }
}

function parseAssertionResult(assertionResult: AssertionResult): TestType {
  const testResult: TestType = {
    name: assertionResult.fullName,
    status:
      assertionResult.status === 'passed'
        ? 'pass'
        : assertionResult.status === 'failed'
          ? 'fail'
          : 'error',
    score: assertionResult.status === 'passed' ? 1 : 0
  }
  return testResult
}

function parseAssertionResults(testResults: TestResult[]): TestType[] {
  return testResults.flatMap((testResult: TestResult) => {
    return testResult.assertionResults.map((assertionResult) =>
      parseAssertionResult(assertionResult)
    )
  })
}

function parseJson(jsonString: string): ResultType {
  try {
    const testResult: FormattedTestResults = JSON.parse(jsonString)

    const result: ResultType = {
      version: 1,
      max_score: testResult.numTotalTests,
      status: testResult.success ? 'pass' : 'fail'
    }
    if (testResult.testResults) {
      result.tests = parseAssertionResults(testResult.testResults)
    }
    return result
  } catch (error) {
    core.error(`Error parsing JSON test results:\n${error}`)
    throw error
  }
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    await runSetupCommandIfProvided()

    const testOutput = await runTests()

    const result = parseJson(testOutput)
    core.setOutput(
      'result',
      Buffer.from(JSON.stringify(result)).toString('base64')
    )
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.error(error.message)
      core.setFailed(error.message)
    }
  }
}
