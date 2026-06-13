import { Text, View } from 'react-native';

const MapView = ({ style }: { style?: any }) => (
    <View style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }, style]}>
        <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>Map preview unavailable on web</Text>
    </View>
);

const Marker = () => null;
const Heatmap = () => null;
const PROVIDER_DEFAULT = 'default';

export { Heatmap, Marker, PROVIDER_DEFAULT };
export default MapView;