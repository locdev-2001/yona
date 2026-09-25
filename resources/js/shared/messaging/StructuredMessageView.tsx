import type { ResolvedStructuredMessage } from './registry';
import type { StructuredMessage } from './model';

/** Vẽ View của một tin đã resolve. Host lo bong bóng chữ, avatar, căn lề. */
export function StructuredMessageView({ resolved, message }: { resolved: ResolvedStructuredMessage; message: StructuredMessage }) {
    const { View } = resolved.definition;

    return <View model={resolved.model} message={message} />;
}
