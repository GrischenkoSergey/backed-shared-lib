import { Span } from '@opentelemetry/api';
import { ISpan, SpanAttributes, SpanTimeInput, SpanAttributeValue, SpanStatus, SpanException } from '../../../features/tracer.feature';

export class TraceSpan implements ISpan {
    constructor(private readonly span: Span) {
        this.span = span;
    }

    get defaultInterface(): Span {
        return this.span;
    }

    public addEvent(name: string, attributesOrStartTime?: SpanAttributes | SpanTimeInput, startTime?: SpanTimeInput) {
        this.span.addEvent(name, attributesOrStartTime, startTime);
    }

    public setAttribute(key: string, value: SpanAttributeValue) {
        this.span.setAttribute(key, value);
    }

    public setAttributes(attributes: SpanAttributes) {
        this.span.setAttributes(attributes);
    }

    public setStatus(status: SpanStatus) {
        this.span.setStatus(status);
    }

    public updateName(name: string) {
        this.span.updateName(name);
    }

    public isRecording(): boolean {
        return this.span.isRecording();
    }

    public recordException(exception: SpanException, time?: SpanTimeInput) {
        this.span.recordException(exception, time);
    }

    public end(endTime?: SpanTimeInput) {
        this.span.end(endTime);
    }
}
