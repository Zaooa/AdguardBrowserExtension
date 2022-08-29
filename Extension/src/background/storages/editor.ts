/**
 * Module used to persist user rules editor content
 * during switches between common and fullscreen modes
 */
export class EditorStorage {
    private data: string | undefined;

    set(data: string) {
        this.data = data;
    }

    get() {
        return this.data;
    }
}

export const editorStorage = new EditorStorage();
