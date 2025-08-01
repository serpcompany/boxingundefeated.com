export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const taskName = body.task
  
  if (!taskName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task name required'
    })
  }
  
  try {
    const result = await runTask(taskName)
    return result
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to run task: ${taskName}`,
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})