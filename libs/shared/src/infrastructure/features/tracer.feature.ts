export const TRACE_SERVICE = Symbol('TRACE_SERVICE');

export declare type SpanAttributeValue = string | number | boolean | Array<null | undefined | string> | Array<null | undefined | number> | Array<null | undefined | boolean>;

export interface SpanAttributes {
    [attributeKey: string]: SpanAttributeValue | undefined;
}

export declare type SpanHrTime = [number, number];
export declare type SpanTimeInput = SpanHrTime | number | Date;

export interface SpanStatus {
    code: SpanStatusCode;
    message?: string;
}

export declare enum SpanStatusCode {
    UNSET = 0,
    OK = 1,
    ERROR = 2
}

interface SpanExceptionWithCode {
    code: string | number;
    name?: string;
    message?: string;
    stack?: string;
}
interface SpanExceptionWithMessage {
    code?: string | number;
    message: string;
    name?: string;
    stack?: string;
}
interface SpanExceptionWithName {
    code?: string | number;
    message?: string;
    name: string;
    stack?: string;
}

export declare type SpanException = SpanExceptionWithCode | SpanExceptionWithMessage | SpanExceptionWithName | string;

export interface ISpan {
    setAttribute(key: string, value: SpanAttributeValue): void;
    setAttributes(attributes: SpanAttributes): void;
    addEvent(name: string, attributesOrStartTime?: SpanAttributes | SpanTimeInput, startTime?: SpanTimeInput): void;
    setStatus(status: SpanStatus): void;
    updateName(name: string): void;
    isRecording(): boolean;
    recordException(exception: SpanException, time?: SpanTimeInput): void;
    end(endTime?: SpanTimeInput): void;
}

export interface ITracer {
    startSpan(name: string): ISpan;
    startActiveSpan(name: string, fn: (span: ISpan) => void): void;
    startActiveSpanAsync(name: string, fn: (span: ISpan) => void): Promise<void>;
}
