import { Dialog, PicoLLM } from "@picovoice/picollm-node";
import { configService } from "./config.service";
import { join, resolve } from "node:path";
import { EventEmitter } from "node:stream";
import fs, { existsSync } from "node:fs";
import { console } from "./console.service";

class LlmService extends EventEmitter {
    picoLLM!: PicoLLM;
    private dialog!: Dialog;
    constructor() {
        super();
    }
    init() {
        const modelDir = resolve( join(configService.__rootDir, 'models', configService.get("PCIO_MODEL")) );
        console.log(`Loading model from ${modelDir}`);
        
        try {
            this.picoLLM = this.picoLLM || new PicoLLM(
                configService.get("PCIO_API_KEY"),
                modelDir,
                {
                    device: 'best',
                }
            );
            this.dialog = this.dialog || this.picoLLM.getDialog(
                undefined, 
                10, 
                'Your are a helpful assistant who is creative, clever, and very friendly.'
            );
        } 
        catch (error) {
            console.panic(`Error loading model from ${modelDir}:`, error);
            process.exit(1);
        }

    }
    async rephrase(phrase: string) {
        const query = `
The user wishes to search the web for information, and have provided the following phrase:
${phrase}

Your task is to rephrase the phrase into a question that can be used with a search engine.
The search engine is DuckDuckGo, and the language is English.
Provide your answer between <question></question> tags without any other text or explanation.
`;
        const rephraseDialog = this.picoLLM.getDialog(
            undefined, 
            10, 
            'Your are an expert in determining the optimimum phrase for a search engine to provide insightful and informative results.'
        )
        rephraseDialog.addHumanRequest(query);
        let response = {completion: phrase};
        try {
            response = await this.picoLLM.generate(rephraseDialog.prompt());
            const rephrasedQuery = response.completion
                                    .replace('<|eot_id|>', '')
                                    .split('<question>')[1]
                                    .split('</question>')[0]
                                    .trim();
            rephraseDialog.addLLMResponse(rephrasedQuery);
        }
        catch (e) {
            console.error(e);
        }
        finally {
            this.emit('end');
        }
        return response;
    }
    async generate(prompt: string) {
        this.dialog.addHumanRequest(prompt);
        let response = {completion: ''};
        try {
            response = await this.picoLLM.generate(
                this.dialog.prompt(), 
                {
                    streamCallback: (tokens) => {
                        this.emit('data', tokens.replace('<|eot_id|>', ''));
                    }
                }
            );
            this.dialog.addLLMResponse(response.completion);
        }
        catch (e) {
            console.error(e);
        }
        finally {
            this.emit('end');
        }
        response.completion = response.completion.replace('<|eot_id|>', '');
        return response;
    }
    async summarize(text: string) {
        const summarizeDialog = this.picoLLM.getDialog(
            undefined, 
            10, 
            'You are an expert in determining summarizing text into concise and meaningful content.'
        )
        summarizeDialog.addHumanRequest(`
Summarize the following without explanation.
Strip out any HTML tags and links, only return text.

${text}`);
        let response = {completion: text};
        try {
            response = await this.picoLLM.generate(summarizeDialog.prompt());
            const summarizedText = response.completion
                                    .replace('<|eot_id|>', '')
                                    .trim();
            summarizeDialog.addLLMResponse(summarizedText);
        }
        catch (e) {
            console.error(e);
        }
        finally {
            this.emit('end');
        }
        return response.completion;
    }
    close() {
        this.picoLLM.release();
        this.picoLLM = null;
        this.dialog = null;
    }
    cancel() {
        this.picoLLM.interrupt();
    }
}

export const llmService = new LlmService();