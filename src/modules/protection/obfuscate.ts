export type ObfuscationConfigType = {
    seed?: number;
    doScrambleSpecialCharacters?: boolean;
}

export default function obfuscate(text: string, config: ObfuscationConfigType): string {
    const seed: number = config.seed ?? 1;
    const words: string[] = text.split(" ");

    const hasSetting: boolean = typeof config.doScrambleSpecialCharacters === "boolean";
    const doScrambleSpecialCharacters: boolean =
        hasSetting ? config.doScrambleSpecialCharacters : true;

    const scrambledWords: string[] = words.map((word: string): string => {
        if (doNotScrambleWord(word, seed)) {
            return word;
        }
        return scramble(word, seed, doScrambleSpecialCharacters);
    });

    return scrambledWords.join(" ");
}

function doNotScrambleWord(str: string, seed: number) {
    return str.length < seed;
}

function containsSpecialChars(str: string) {
    const specialChars = /[`!@#$%^&*()_+\-=[\]{};':“"\\|,.<>/?~’—”]/;
    return specialChars.test(str);
}

function scramble(word: string, seed: number, doScrambleSpecialCharacters: boolean) {
    let tokens: string[] = word.split("");

    let len: number = tokens.length;
    let n: number = Math.floor(len / seed);

    if (n === len) {
        n--;
    }

    let swap: string;
    let i: number;

    while (n > 0) {
        if (containsSpecialChars(tokens[n]) && !doScrambleSpecialCharacters) {
            n--;
        } else {
            i = getRandomAlphaTokenIndex(tokens, 10, doScrambleSpecialCharacters);
            swap = tokens[n];
            tokens[n] = tokens[i];
            tokens[i] = swap;
            n--;
        }
    }
    return tokens.join("");
}

function getRandomAlphaTokenIndex(
    tokens: string[],
    numberOfTimesToTry: number,
    doScrambleSpecialCharacters: boolean) {
    const i = Math.floor(Math.random() * tokens.length);
    if (!(containsSpecialChars(tokens[i]) && !doScrambleSpecialCharacters)) {
        return i;
    }
    if (numberOfTimesToTry === 0) {
        return 0;
    }
    return getRandomAlphaTokenIndex(tokens, numberOfTimesToTry - 1, doScrambleSpecialCharacters);
}
