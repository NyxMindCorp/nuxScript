export interface AnalysisResult {
    functions: FunctionInfo[];
    classes: ClassInfo[];
    variables: VariableInfo[];
    imports: ImportInfo[];
    exports: ExportInfo[];
}
export interface FunctionInfo {
    name: string;
    line: number;
    params: string[];
    async: boolean;
}
export interface ClassInfo {
    name: string;
    line: number;
    methods: string[];
}
export interface VariableInfo {
    name: string;
    line: number;
    type?: string;
}
export interface ImportInfo {
    source: string;
    imports: string[];
}
export interface ExportInfo {
    name: string;
    line: number;
}
export declare function analyzeCode(code: string): AnalysisResult;
export declare function formatAnalysis(result: AnalysisResult): string;
