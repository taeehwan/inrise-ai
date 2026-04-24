import { initializeDefaultAdminUser, seedStorageBootstrapData } from "./lib/storageBootstrap";
import { MemStorageStateBase } from "./memStorageStateBase";
import type { IStorage } from "./storage.interface";

export class MemStorage extends MemStorageStateBase implements IStorage {
  constructor() {
    super();
    initializeDefaultAdminUser(this.users).catch(err => console.error("Failed to initialize admin:", err));
    seedStorageBootstrapData({
      speakingTests: this.speakingTests,
      questions: this.questions,
      testSets: this.testSets,
      testSetComponents: this.testSetComponents,
    });
    this.initializeSuccessProgramData();
    // Load AI generated tests from database on startup
    this.loadAIGeneratedTestsFromDatabase();
  }

}

export const storage = new MemStorage();
