import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useTheme } from "../../theme/theme";
import { ALL_SCENES, sceneFor, type Scene } from "./scenes";

/**
 * The stadium behind the app: one photo per section, faded in over the previous one when the user
 * changes section or theme. A veil (dark at night, light by day) keeps the glass panels readable.
 * Static on purpose: moving it would make every glass panel re-blur on each frame.
 */
export default function StadiumBackdrop() {
  const { pathname } = useLocation();
  const scene = sceneFor(pathname, useTheme());
  const [layers, setLayers] = useState<Scene[]>([scene]);
  if (layers[layers.length - 1].src !== scene.src || layers[layers.length - 1].position !== scene.position) {
    setLayers((current) => [...current.slice(-1), scene]);
  }

  useEffect(() => {
    // Once the first photo is shown, download the others in the background.
    const timer = window.setTimeout(() => ALL_SCENES.forEach((src) => { new Image().src = src; }), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="stadium-backdrop" aria-hidden="true">
      {layers.map((layer, index) => (
        <div key={`${layer.src}|${layer.position}`} className={index > 0 ? "stadium-photo is-entering" : "stadium-photo"}
          style={{ backgroundImage: `url("${layer.src}")`, backgroundPosition: layer.position }}
          onAnimationEnd={() => setLayers((current) => current.slice(-1))} />
      ))}
      <div className="stadium-veil" />
    </div>
  );
}
