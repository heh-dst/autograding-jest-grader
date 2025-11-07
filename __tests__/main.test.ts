/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.ts'
import { exec } from '../__fixtures__/exec.ts'
import { Buffer } from 'node:buffer'
import type { FormattedTestResults } from '../src/types.ts'
import type { runTests } from '../src/runner'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/exec', () => ({ exec }))
const mockedRunTest = jest.fn<typeof runTests>()
jest.unstable_mockModule('../src/runner.js', () => ({
  runTests: mockedRunTest
}))

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

function mockJestReturns(numFailedTests: number, numPassedTests: number): void {
  const exitCode = numFailedTests === 0 ? 0 : 1
  const numTotalTests = numFailedTests + numPassedTests
  const numFailedTestSuites = numFailedTests === 0 ? 0 : 1
  const numPassedTestSuites = numPassedTests === 0 ? 0 : 1
  const numTotalTestSuites = numFailedTestSuites + numPassedTestSuites
  const result: FormattedTestResults = {
    numFailedTests,
    numPassedTests,
    numTotalTests,
    numFailedTestSuites,
    numPassedTestSuites,
    numPendingTestSuites: 0,
    numPendingTests: 0,
    numRuntimeErrorTestSuites: 0,
    numTotalTestSuites,
    snapshot: {
      added: 0,
      didUpdate: false,
      failure: false,
      filesAdded: 0,
      filesRemoved: 0,
      filesRemovedList: [],
      filesUnmatched: 0,
      filesUpdated: 0,
      matched: 0,
      total: 0,
      unchecked: 0,
      uncheckedKeysByFile: [],
      unmatched: 0,
      updated: 0
    },
    startTime: Date.now(),
    success: exitCode === 0,
    testResults: [],
    wasInterrupted: false
  }
  mockedRunTest.mockResolvedValueOnce(JSON.stringify(result))
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

  it('Includes the individual passed test', async () => {
    const result: FormattedTestResults = {
      numFailedTests: 0,
      numPassedTests: 1,
      numTotalTests: 1,
      numFailedTestSuites: 0,
      numPassedTestSuites: 1,
      numPendingTestSuites: 0,
      numPendingTests: 0,
      numRuntimeErrorTestSuites: 0,
      numTotalTestSuites: 1,
      snapshot: {
        added: 0,
        didUpdate: false,
        failure: false,
        filesAdded: 0,
        filesRemoved: 0,
        filesRemovedList: [],
        filesUnmatched: 0,
        filesUpdated: 0,
        matched: 0,
        total: 0,
        unchecked: 0,
        uncheckedKeysByFile: [],
        unmatched: 0,
        updated: 0
      },
      startTime: Date.now(),
      success: true,
      testResults: [
        {
          assertionResults: [
            {
              ancestorTitles: ['calculerMoyenne'],
              duration: 1,
              failureMessages: [],
              fullName: 'calculerMoyenne calcule la moyenne de plusieurs notes',
              location: null,
              status: 'passed',
              title: 'calcule la moyenne de plusieurs notes'
            }
          ],
          endTime: 1762529939635,
          message: '',
          name: 'D:\\\\programmation-tg-templates\\\\workspace\\\\types-modules-TP3\\\\src\\\\test\\\\affichage.test.ts',
          startTime: 1762529939435,
          status: 'passed',
          summary: '',
          coverage: null
        }
      ],
      wasInterrupted: false
    }
    mockedRunTest.mockResolvedValueOnce(JSON.stringify(result))
    // Verify the result status was set.
    const decodedResult = await runAndDecodeResult()
    expect(decodedResult.tests).toEqual([
      {
        name: 'calculerMoyenne calcule la moyenne de plusieurs notes',
        status: 'pass'
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

  it('Bugfix: should return pass when all tests pass', async () => {
    const fullOutput = `
{"numFailedTestSuites":0,"numFailedTests":0,"numPassedTestSuites":3,"numPassedTests":18,"numPendingTestSuites":0,"numPendingTests":0,"numRuntimeErrorTestSuites":0,"numTodoTests":0,"numTotalTestSuites":3,"numTotalTests":18,"openHandles":[],"snapshot":{"added":0,"didUpdate":false,"failure":false,"filesAdded":0,"filesRemoved":0,"filesRemovedList":[],"filesUnmatched":0,"filesUpdated":0,"matched":0,"total":0,"unchecked":0,"uncheckedKeysByFile":[],"unmatched":0,"updated":0},"startTime":1762528412699,"success":true,"testResults":[{"assertionResults":[{"ancestorTitles":["afficherBulletins"],"duration":4,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"afficherBulletins affiche le tableau des bulletins avec les bons résultats","invocations":1,"location":null,"numPassingAsserts":2,"retryReasons":[],"startAt":1762528412997,"status":"passed","title":"affiche le tableau des bulletins avec les bons résultats"},{"ancestorTitles":["afficherBulletins"],"duration":1,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"afficherBulletins affiche le tableau vide si aucun étudiant","invocations":1,"location":null,"numPassingAsserts":2,"retryReasons":[],"startAt":1762528413001,"status":"passed","title":"affiche le tableau vide si aucun étudiant"}],"endTime":1762528413003,"message":"","name":"D:\\\\programmation-tg-templates\\\\workspace\\\\types-modules-TP3\\\\src\\\\test\\\\affichage.test.ts","startTime":1762528412771,"status":"passed","summary":""},{"assertionResults":[{"ancestorTitles":["calculerMoyenne"],"duration":1,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"calculerMoyenne calcule la moyenne de plusieurs notes","invocations":1,"location":null,"numPassingAsserts":4,"retryReasons":[],"startAt":1762528413052,"status":"passed","title":"calcule la moyenne de plusieurs notes"},{"ancestorTitles":["calculerMoyenne"],"duration":0,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"calculerMoyenne retourne 0 si le tableau est vide","invocations":1,"location":null,"numPassingAsserts":1,"retryReasons":[],"startAt":1762528413054,"status":"passed","title":"retourne 0 si le tableau est vide"},{"ancestorTitles":["calculerMoyenne"],"duration":1,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"calculerMoyenne arrondit à deux décimales","invocations":1,"location":null,"numPassingAsserts":1,"retryReasons":[],"startAt":1762528413054,"status":"passed","title":"arrondit à deux décimales"},{"ancestorTitles":["donnerAppreciation"],"duration":1,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"donnerAppreciation Excellent si moyenne >= 16","invocations":1,"location":null,"numPassingAsserts":2,"retryReasons":[],"startAt":1762528413055,"status":"passed","title":"Excellent si moyenne >= 16"},{"ancestorTitles":["donnerAppreciation"],"duration":1,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"donnerAppreciation Très bien si moyenne >= 14 et < 16","invocations":1,"location":null,"numPassingAsserts":2,"retryReasons":[],"startAt":1762528413056,"status":"passed","title":"Très bien si moyenne >= 14 et < 16"},{"ancestorTitles":["donnerAppreciation"],"duration":0,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"donnerAppreciation Bien si moyenne >= 12 et < 14","invocations":1,"location":null,"numPassingAsserts":2,"retryReasons":[],"startAt":1762528413057,"status":"passed","title":"Bien si moyenne >= 12 et < 14"},{"ancestorTitles":["donnerAppreciation"],"duration":1,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"donnerAppreciation Passable si moyenne >= 10 et < 12","invocations":1,"location":null,"numPassingAsserts":2,"retryReasons":[],"startAt":1762528413057,"status":"passed","title":"Passable si moyenne >= 10 et < 12"},{"ancestorTitles":["donnerAppreciation"],"duration":1,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"donnerAppreciation Insuffisant si moyenne < 10","invocations":1,"location":null,"numPassingAsserts":3,"retryReasons":[],"startAt":1762528413058,"status":"passed","title":"Insuffisant si moyenne < 10"},{"ancestorTitles":["genererBulletin"],"duration":0,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"genererBulletin génère le bulletin complet pour Alice","invocations":1,"location":null,"numPassingAsserts":1,"retryReasons":[],"startAt":1762528413059,"status":"passed","title":"génère le bulletin complet pour Alice"},{"ancestorTitles":["genererBulletin"],"duration":0,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"genererBulletin génère le bulletin complet pour Bob","invocations":1,"location":null,"numPassingAsserts":1,"retryReasons":[],"startAt":1762528413060,"status":"passed","title":"génère le bulletin complet pour Bob"},{"ancestorTitles":["genererBulletin"],"duration":1,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"genererBulletin génère le bulletin complet pour Charlie","invocations":1,"location":null,"numPassingAsserts":1,"retryReasons":[],"startAt":1762528413060,"status":"passed","title":"génère le bulletin complet pour Charlie"},{"ancestorTitles":["genererBulletin"],"duration":0,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"genererBulletin génère le bulletin complet pour Diane","invocations":1,"location":null,"numPassingAsserts":1,"retryReasons":[],"startAt":1762528413061,"status":"passed","title":"génère le bulletin complet pour Diane"},{"ancestorTitles":["genererBulletin"],"duration":1,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"genererBulletin bulletin avec tableau de notes vide","invocations":1,"location":null,"numPassingAsserts":1,"retryReasons":[],"startAt":1762528413061,"status":"passed","title":"bulletin avec tableau de notes vide"}],"endTime":1762528413063,"message":"","name":"D:\\\\programmation-tg-templates\\\\workspace\\\\types-modules-TP3\\\\src\\\\test\\\\calculs.test.ts","startTime":1762528413014,"status":"passed","summary":""},{"assertionResults":[{"ancestorTitles":["Types - Etudiant"],"duration":1,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"Types - Etudiant Etudiant doit avoir les propriétés nom et notes","invocations":1,"location":null,"numPassingAsserts":3,"retryReasons":[],"startAt":1762528413109,"status":"passed","title":"Etudiant doit avoir les propriétés nom et notes"},{"ancestorTitles":["Types - Etudiant"],"duration":0,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"Types - Etudiant notes doit être un tableau de nombres","invocations":1,"location":null,"numPassingAsserts":4,"retryReasons":[],"startAt":1762528413110,"status":"passed","title":"notes doit être un tableau de nombres"},{"ancestorTitles":["Types - Bulletin"],"duration":1,"failing":false,"failureDetails":[],"failureMessages":[],"fullName":"Types - Bulletin Bulletin doit avoir les propriétés nom, moyenne et appreciation","invocations":1,"location":null,"numPassingAsserts":5,"retryReasons":[],"startAt":1762528413110,"status":"passed","title":"Bulletin doit avoir les propriétés nom, moyenne et appreciation"}],"endTime":1762528413111,"message":"","name":"D:\\\\programmation-tg-templates\\\\workspace\\\\types-modules-TP3\\\\src\\\\test\\\\types.test.ts","startTime":1762528413081,"status":"passed","summary":""}],"wasInterrupted":false}
`

    mockedRunTest.mockResolvedValueOnce(fullOutput)

    const decodedResult = await runAndDecodeResult()
    expect(decodedResult.status).toBe('pass')
    expect(decodedResult.max_score).toBe(18)
  })
})
