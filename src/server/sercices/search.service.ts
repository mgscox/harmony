import axios from 'axios';
import * as cheerio from 'cheerio';

const searchUrl = `https://html.duckduckgo.com/html/?q={query}`;

class SearchService {
    async getSearchResults(query: string) {
        const response = await axios.get(searchUrl.replace('{query}', query));
        const list = this.getSearchLinks(response.data as string);
        try {
            await Promise.all(
                list.map(async (result) => {
                    const response = await axios.get(result.url);
                    result.description = response.data;
                    const $ = cheerio.load(response.data as string);
                    const rootEl = $('article').get() || $('body').get();
                    result.description += rootEl.map(e => $(e).text().trim()).join(" ");
                    result.description = result.description.slice(0, 1000);
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