import { Dialog, PicoLLM } from "@picovoice/picollm-node";
import { configService } from "./config.service";
import { join, resolve } from "node:path";
import { EventEmitter } from "node:stream";

class LlmService extends EventEmitter {
    picoLLM: PicoLLM;
    private dialog: Dialog;
    constructor() {
        super();
        this.init();
    }
    init() {
        const modelDir = resolve( join(configService.__rootDir, 'models', configService.get("PCIO_MODEL")) );
        console.log(`Loading model from ${modelDir}`);
        this.picoLLM = this.picoLLM ||new PicoLLM(
            configService.get("PCIO_API_KEY"),
            modelDir,
            {
              device: 'best'
            }
        );
        this.dialog = this.dialog || this.picoLLM.getDialog(
            undefined, 
            10, 
            'Your are a helpful assistant who is creative, clever, and very friendly.'
        );
    }
    async generate(prompt: string) {
        this.dialog.addHumanRequest(prompt);
        let response = {completion: ''};
        try {
            response = await this.picoLLM.generate(
                this.dialog.prompt(), 
                {
                    streamCallback: (tokens) => {
                        this.emit('data', tokens);
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
        return response;
    }
    close() {
        this.picoLLM.release();
        this.picoLLM = null;
        this.dialog = null;
    }
}

export const llmService = new LlmService();