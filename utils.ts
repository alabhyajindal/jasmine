export function getExpected(sourceText: string): string[] {
    let lines = sourceText.split('\n')
    let comments = lines.filter((line) => line.substring(0, 2) == '//')
    let expected = comments.map((comment) => comment.substring(2).trim())
    return expected
}
