const fs = require('fs-extra');
const path = require('path');

class FileCleanup {
    constructor() {
        this.pendingDeletions = new Map(); // filepath -> retry count
        this.maxRetries = 5;
    }

    // Schedule a file for deletion with retry logic
    scheduleDelete(filepath, delay = 2000) {
        if (this.pendingDeletions.has(filepath)) {
            return; // Already scheduled
        }

        this.pendingDeletions.set(filepath, 0);
        
        setTimeout(() => {
            this.attemptDelete(filepath);
        }, delay);
    }

    // Attempt to delete a file with retry logic
    async attemptDelete(filepath) {
        const retryCount = this.pendingDeletions.get(filepath) || 0;
        
        try {
            if (await fs.pathExists(filepath)) {
                await fs.remove(filepath);
                console.log(`✅ Deleted audio file: ${path.basename(filepath)}`);
                this.pendingDeletions.delete(filepath);
                return true;
            } else {
                // File doesn't exist, remove from pending
                this.pendingDeletions.delete(filepath);
                return true;
            }
        } catch (error) {
            if (error.code === 'EBUSY' || error.code === 'EPERM') {
                if (retryCount < this.maxRetries) {
                    const nextRetry = retryCount + 1;
                    const delay = nextRetry * 3000; // Exponential backoff
                    
                    console.log(`⏳ File busy, retry ${nextRetry}/${this.maxRetries} in ${delay/1000}s: ${path.basename(filepath)}`);
                    this.pendingDeletions.set(filepath, nextRetry);
                    
                    setTimeout(() => {
                        this.attemptDelete(filepath);
                    }, delay);
                } else {
                    console.log(`⚠️ Could not delete file after ${this.maxRetries} attempts: ${path.basename(filepath)}`);
                    this.pendingDeletions.delete(filepath);
                }
            } else {
                console.error(`❌ Error deleting file: ${error.message}`);
                this.pendingDeletions.delete(filepath);
            }
            return false;
        }
    }

    // Get status of pending deletions
    getStatus() {
        return {
            pending: this.pendingDeletions.size,
            files: Array.from(this.pendingDeletions.keys()).map(fp => path.basename(fp))
        };
    }

    // Force cleanup of all pending files
    async forceCleanup() {
        const files = Array.from(this.pendingDeletions.keys());
        this.pendingDeletions.clear();
        
        let deleted = 0;
        for (const filepath of files) {
            try {
                if (await fs.pathExists(filepath)) {
                    await fs.remove(filepath);
                    deleted++;
                }
            } catch (error) {
                console.log(`Could not force delete: ${path.basename(filepath)}`);
            }
        }
        
        return { attempted: files.length, deleted };
    }
}

// Create singleton instance
const fileCleanup = new FileCleanup();

module.exports = fileCleanup;