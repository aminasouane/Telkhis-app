import 'dotenv/config';
import { summarizeWithGrok } from './server/services/summarizeWithGrok.js';

const DURATION_MS = 60000; // 1 minute
const CONCURRENCY = 10; // Number of concurrent requests

async function testGrokRateLimit() {
  console.log(`Starting Grok API rate limit test for ${DURATION_MS / 1000} seconds with concurrency ${CONCURRENCY}...`);
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  let rateLimitErrors = 0;
  
  const transcript = "هذا نص تجريبي قصير لمعرفة كمية الطلبات التي يمكن لخادم grok معالجتها في الدقيقة الواحدة. الرجاء التلخيص باختصار شديد.";

  const worker = async (workerId: number) => {
    while (Date.now() - startTime < DURATION_MS) {
      try {
        await summarizeWithGrok({
          transcript: transcript + " [" + Date.now() + "-" + workerId + "]",
          language: "ar",
          maxTokens: 50 // small max tokens for fast response
        });
        successCount++;
        process.stdout.write(`\r[${Math.floor((Date.now() - startTime) / 1000)}s] Success: ${successCount} | Failed: ${failCount} | 429: ${rateLimitErrors}   `);
      } catch (err: any) {
        failCount++;
        const errMsg = err.message || "";
        if (errMsg.includes("الحد الأقصى للطلبات") || errMsg.includes("429")) {
          rateLimitErrors++;
          // Back off slightly on rate limit
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // Other error, maybe timeout
          console.log(`\nWorker ${workerId} Error: ${errMsg}`);
        }
        process.stdout.write(`\r[${Math.floor((Date.now() - startTime) / 1000)}s] Success: ${successCount} | Failed: ${failCount} | 429: ${rateLimitErrors}   `);
      }
    }
  };

  const workers = Array.from({ length: CONCURRENCY }).map((_, i) => worker(i + 1));
  await Promise.all(workers);
  
  console.log("\n\n--- Test Complete ---");
  const actualDuration = (Date.now() - startTime) / 1000;
  console.log(`Total duration: ${actualDuration.toFixed(2)}s`);
  console.log(`Successful requests: ${successCount}`);
  console.log(`Failed requests: ${failCount}`);
  console.log(`Requests Rate Limit Hit: ${rateLimitErrors}`);
  console.log(`Estimated RPS (Successful): ${(successCount / actualDuration).toFixed(2)} req/s`);
  console.log(`Estimated RPM (Successful): ${(successCount / actualDuration * 60).toFixed(2)} req/min`);
}

testGrokRateLimit().catch(console.error);
