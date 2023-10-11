// TODO: Separate into a module
export async function validateOpenAIApiKey({ api_key }: { api_key: string }): Promise<boolean> {
  const openAIModelsEndpoint = "https://api.openai.com/v1/models"

  try {
    const response = await fetch(openAIModelsEndpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${api_key}`,
        "Content-Type": "application/json",
      },
    })
    if (response.status === 200) {
      return true
    } else {
      console.error(`Error validating API key: ${response.statusText}`)
      return false
    }
  } catch (error) {
    console.error("Error validating API key:", error)
    return false
  }
}
