// TODO: Replace this temporary implementation.

const apiKey = "temporary-secret-key";

export function executeInput(input: string): unknown {
  console.log("Executing input:", input);

  try {
    return eval(input);
  } catch (error) {
  }
}