/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import { exec, getExecOutput } from '../__fixtures__/exec.js'
import { Buffer } from 'node:buffer'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/exec', () => ({ exec, getExecOutput }))

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

function mockJestReturns(numFailedTests: number, numPassedTests: number): void {
  const exitCode = numFailedTests === 0 ? 0 : 1
  const numTotalTests = numFailedTests + numPassedTests
  getExecOutput.mockImplementationOnce(() =>
    Promise.resolve({
      exitCode,
      stdout: JSON.stringify({
        numFailedTests,
        numPassedTests,
        numTotalTests,
        success: exitCode === 0
      }),
      stderr: ''
    })
  )
}

async function runAndDecodeResult() {
  await run()
  const resultBase64: string = core.setOutput.mock.lastCall![1]
  const decodedResult = JSON.parse(
    Buffer.from(resultBase64, 'base64').toString()
  )
  return decodedResult
}

describe('main.ts', () => {
  beforeEach(() => {
    // Set the action's inputs as return values from core.getInput().
    // core.getInput.mockImplementation(() => undefined)

    exec.mockImplementation(() => Promise.resolve(0))
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('Executes the setup command when provided', async () => {
    const setupCommand = 'echo "Setting up..."'
    core.getInput.mockImplementationOnce(() => setupCommand)

    await run()

    // Verify the setup command was executed.
    expect(exec).toHaveBeenCalledWith(setupCommand)
  })

  it('Sets the result output', async () => {
    mockJestReturns(0, 1)

    await run()

    // Verify the result output was set.
    expect(core.setOutput).toHaveBeenCalledTimes(1)
    expect(core.setOutput).toHaveBeenCalledWith('result', expect.anything())
  })

  it('Sets the version', async () => {
    mockJestReturns(0, 1)

    // Verify the result status was set.
    const decodedResult = await runAndDecodeResult()
    expect(decodedResult.version).toBe(1)
  })

  test.each([
    [0, 3, 3],
    [3, 0, 3],
    [2, 2, 4]
  ])(
    'Sets the max_score with %i failed and %i passed tests',
    async (failed, passed, expected) => {
      mockJestReturns(failed, passed)

      // Verify the result status was set.
      const decodedResult = await runAndDecodeResult()
      expect(decodedResult.max_score).toBe(expected)
    }
  )

  test.each([
    { failed: 0, passed: 3, expected: 'pass' },
    { failed: 1, passed: 0, expected: 'fail' },
    { failed: 2, passed: 3, expected: 'fail' }
  ])(
    'Sets the result status to $expected with $failed failed and $passed passed tests',
    async ({ failed, passed, expected }) => {
      mockJestReturns(failed, passed)

      // Verify the result status was set.
      const decodedResult = await runAndDecodeResult()
      expect(decodedResult.status).toBe(expected)
    }
  )

  it('Includes the individual test results', async () => {
    getExecOutput.mockImplementationOnce(() =>
      Promise.resolve({
        exitCode: 0,
        stdout: JSON.stringify({
          numFailedTests: 0,
          numPassedTests: 1,
          numTotalTests: 1,
          success: true,
          testResults: [
            {
              name: 'main.ts Sets the result output',
              status: 'passed'
            }
          ]
        }),
        stderr: ''
      })
    )
    // Verify the result status was set.
    const decodedResult = await runAndDecodeResult()
    expect(decodedResult.tests).toEqual([
      {
        name: 'main.ts Sets the result output',
        status: 'passed'
      }
    ])
  })

  it('Fails the action on error', async () => {
    const errorMessage = 'An unexpected error occurred.'
    exec.mockImplementationOnce(() => {
      throw new Error(errorMessage)
    })

    await run()

    // Verify the action was failed with the error message.
    expect(core.setFailed).toHaveBeenCalledWith(errorMessage)
  })
})
