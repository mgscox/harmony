import axios from 'axios';
import * as cheerio from 'cheerio';
import EventEmitter from 'node:events';
import { console } from "./console.service";

const searchUrl = `https://html.duckduckgo.com/html/?q={query}`;

class SearchService extends EventEmitter {
    async getSearchResults(query: string) {
        const response = await axios.get(searchUrl.replace('{query}', query));
        const list = this.getSearchLinks(response.data as string);
        const count = list.length;
        this.emit('web-results', `Reading ${count} web page${count > 1 ? 's' : ''}...`);
        try {
            await Promise.all(
                list.map(async (result) => {
                    try {

                        if (result.url.startsWith('/')) {
                            const url = new URL(`https:${ decodeURIComponent(result.url) }`);
                            result.url = url.searchParams.get('uddg') || url.href;
                            result.description = '';
                        }

                        const response = await axios.get(result.url);
                        result.description = response.data;
                        const $ = cheerio.load(response.data as string);
                        const title = $('title').text();
                        const finalUrl = (response as any).request?.res?.responseUrl || response.config.url;
                        result.description = `#${title} - ${finalUrl}\n\n##Summary ${result.description}\n\n`;
                        
                        // Remove unwanted elements
                        $('script, style, noscript, iframe, img, svg, audio, video').remove();
                        
                        const rootEl = $('main').get() || $('body').get();
                        const textContent = rootEl
                            .map(e => {
                                const $el = $(e);
                                // Only get text from elements we want
                                if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'main', 'article', 'section', 'li', 'span', 'td', 'th'].includes($el.prop('tagName').toLowerCase())) {
                                    return $el.text().trim();
                                }
                                return '';
                            })
                            .filter(text => text.length > 0)
                            .join(" ");
                        
                        result.description += textContent;
                    }
                    catch(e) {
                        console.warn(`Unable to load ${result.url}`);
                    }
                })
            )
        }
        catch(e) {
            console.error(e);
        }
        finally {
            return list.filter((result) => result.description.length > 0).slice(0, 5);
        }
    }
    private getSearchLinks(html: string) {
        const $ = cheerio.load(html);
        const results = $('.result');
        return results.map((_, result) => {
            const title = $(result).find('.result__title').text();
            const description = $(result).find('.result__snippet').text();
            const url = $(result).find('.result__a').attr('href');
            return { title, description, url };
        }).get();
    }
}

export const searchService = new SearchService();