import {
  deleteAIGeneratedTestRecord,
  getActiveTestsBySectionRecord,
  getAIGeneratedTestByIdRecord,
  getAIGeneratedTestRecord,
  getAIGeneratedTestsByCreatorRecord,
  getAllAIGeneratedTestsAdminMetadataRecord,
  getAllAIGeneratedTestsAdminRecord,
  getAllAIGeneratedTestsMetadataRecord,
  getAllAIGeneratedTestsRecord,
  saveAIGeneratedTestRecord,
  updateAIGeneratedTestRecord,
  updateAITestStatusRecord,
} from "./lib/aiGeneratedTestStorage";
import { DelegatedStorageAnalyticsBase } from "./delegatedStorageAnalyticsBase";

type JsonRecord = Record<string, unknown>;

export abstract class DelegatedStorageBase extends DelegatedStorageAnalyticsBase {
  protected abstract tests: Map<string, unknown>;

  async saveAIGeneratedTest(testId: string, testData: JsonRecord, options?: { activateImmediately?: boolean }) {
    return saveAIGeneratedTestRecord(testId, testData, options);
  }

  async updateAIGeneratedTest(testId: string, updates: JsonRecord) {
    return updateAIGeneratedTestRecord(testId, updates);
  }

  async getAIGeneratedTestsByCreator(creatorId: string) {
    return getAIGeneratedTestsByCreatorRecord(creatorId);
  }

  async getAIGeneratedTest(testId: string) {
    return getAIGeneratedTestRecord(testId);
  }

  async getAIGeneratedTestById(testId: string) {
    return getAIGeneratedTestByIdRecord(testId);
  }

  async getAllAIGeneratedTests() {
    return getAllAIGeneratedTestsRecord();
  }

  async getAllAIGeneratedTestsMetadata() {
    return getAllAIGeneratedTestsMetadataRecord();
  }

  async deleteAIGeneratedTest(testId: string) {
    const { dbId, memoryKeys } = await deleteAIGeneratedTestRecord(testId);
    if (dbId) {
      console.log(`✅ Deleted from database: ${dbId}`);
    } else {
      console.log(`⚠️ AI test not found in database: ${testId}`);
    }
    for (const key of memoryKeys) {
      this.tests.delete(key);
    }
    console.log(`❌ AI test completely deleted: ${testId}`);
  }

  async updateAITestStatus(testId: string, isActive: boolean) {
    await updateAITestStatusRecord(testId, isActive);
    console.log(`Updated AI test ${testId} status to ${isActive ? "active" : "inactive"}`);
  }

  async getAllAIGeneratedTestsAdmin() {
    return getAllAIGeneratedTestsAdminRecord();
  }

  async getActiveTestsBySection(examType: string, section: string) {
    return getActiveTestsBySectionRecord(examType, section);
  }

  async getAllAIGeneratedTestsAdminMetadata() {
    return getAllAIGeneratedTestsAdminMetadataRecord();
  }
}
