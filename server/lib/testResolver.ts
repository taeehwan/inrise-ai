type TestResolverLoaders = {
  getTest: (testId: string) => Promise<any>;
  getTestSet: (testSetId: string) => Promise<any>;
  getAIGeneratedTest: (testId: string) => Promise<any>;
};

export async function resolveAttemptTestData(loaders: TestResolverLoaders, testId: string) {
  const [test, testSet, aiTest] = await Promise.all([
    loaders.getTest(testId),
    loaders.getTestSet(testId?.replace("testset-", "")),
    loaders.getAIGeneratedTest(testId),
  ]);

  return test || testSet || aiTest;
}
