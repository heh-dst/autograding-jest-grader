import * as core from '@actions/core'
import * as exec from '@actions/exec'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const setupCommand: string = core.getInput('setup-command')
    if (setupCommand) {
      core.debug(`Executing setup command: ${setupCommand} ...`)
      await exec.exec(setupCommand)
    } else {
      core.debug(
        'No setup command provided, executing default: npm install ...'
      )
      await exec.exec('npm', ['install'], {})
    }
    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug('Running tests with Jest ...')

    // Log the current timestamp, wait, then log the new timestamp
    core.debug(new Date().toTimeString())
    const testOutput = await exec.getExecOutput('npm', ['test'], {
      ignoreReturnCode: true
    })
    core.debug(new Date().toTimeString())

    const testResult = JSON.parse(testOutput.stdout)
    const result = {
      version: 1,
      max_score: testResult.numTotalTests,
      status: testResult.success ? 'pass' : 'fail'
    }

    core.setOutput(
      'result',
      Buffer.from(JSON.stringify(result)).toString('base64')
    )
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
