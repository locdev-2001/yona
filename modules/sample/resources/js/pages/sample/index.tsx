export default function SampleIndex({ message }: { message: string }) {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold">Sample Module</h1>
            <p className="mt-2 text-gray-600">{message}</p>
        </div>
    );
}
