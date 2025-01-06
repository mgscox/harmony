const searchInput = document.getElementById('searchInput') as HTMLInputElement;
const searchButton = document.getElementById('searchButton') as HTMLButtonElement;
const resultDiv = document.getElementById('result') as HTMLDivElement;
const loadingDiv = document.getElementById('loading') as HTMLDivElement;
const cancelButton = document.getElementById('cancelButton') as HTMLButtonElement;

function scrollToBottom() {
    window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
    });
}

async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    try {
        loadingDiv.style.display = 'block';
        resultDiv.style.display = 'none';
        loadingDiv.textContent = 'Searching...';
        resultDiv.textContent = '';
        let markedDown = '';
        
        // Setup streaming handlers
        window.electronAPI.removeStreamListeners();
        window.electronAPI.onStreamData(async (data) => {
            
            if (data.length === 0) {
                return;
            }

            markedDown += data;
            resultDiv.innerHTML = await window.marked.parse(markedDown);
            scrollToBottom();
            resultDiv.style.display = 'block';
            loadingDiv.style.display = 'none';
            cancelButton.style.display = 'block';
            searchButton.style.display = 'none';
        });
        window.electronAPI.onStreamEnd(() => {
            loadingDiv.style.display = 'none';
            cancelButton.style.display = 'none';
            searchButton.style.display = 'block';
            scrollToBottom();
        });
        window.electronAPI.onWebResults((results: string) => {
            loadingDiv.textContent = results;
            scrollToBottom();
        });
        
        cancelButton.style.display = 'block';
        searchButton.style.display = 'none';
        await window.electronAPI.searchQuery(query);
    } 
    catch (error: any) {
        resultDiv.textContent = `Error: ${error?.message}`;
    }
    finally {
        loadingDiv.style.display = 'none';
        cancelButton.style.display = 'none';
        searchButton.style.display = 'block';
    }
}

searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});
cancelButton.addEventListener('click', () => {
    window.electronAPI.cancelQuery();
});