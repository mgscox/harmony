import { llmService } from "./sercices/llm.service";
import { searchService } from "./sercices/search.service";

const readline = require("node:readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
const getPrompt = (): Promise<string> => {
    return new Promise(resolve => {
        rl.question(">>> ", (input: string) => {
          resolve(input);
        });
    });
}
const stream = (chunk: string) => {
    rl.write(chunk);
}
async function main() {
    llmService.on('data', (chunk) => stream(chunk));
    llmService.on('end', () => stream('\n'));
    let quit = false;
    
    do {
        const prompt = await getPrompt();
        quit = !prompt.length || prompt.toLowerCase() === 'quit';
        
        if (!quit) {
            const results = await searchService.getSearchResults(prompt);
            if (results.length > 0) {
                console.log('Search results:', results.length);
                const searchPrompt = `
Your task is to provide a summary of the search results.

# Results
${results.map((result, index) => `
    ##[${index + 1}] ${result.title} (retrieved from ${result.url})
    ${result.description}

`).join('\n')}


# Rules
1. You may augment with your own knowledge - but if so you MUST be clear it is your opinion.
2. Each time you use information from a search result, annotate your output with a citation of the search result used at that point in your output.
E.g. to annotate text "mary had a little lamb" for citations from search results 1 and 4 you would write "mary had a little lamb [1],[4]".
3. At the end of your summary, provide a bullet-list of the search results used as citations.
E.g. you for result 1 you would write "[1] title of webpage (url of webpage)" replacing the title and url.
4. Your summary must not exceed 1000 words (3000 tokens)
5. DO NOT REPEAT ANY OF THE SEARCH RESULTS IN YOUR SUMMARY.
6. DO NOT DIRECTLY REFER TO THE SEARCH RESULTS IN YOUR SUMMARY - write your summary as a stand alone article

Your summary:
`;
                const response = await llmService.generate(searchPrompt);
                console.log(response.completion + '\n');
            }
        }

    } while (!quit)

    llmService.close();
    rl.close();
}

main();