import { mediaUrl } from "../../api/http";
import type { Memory } from "../../api/types";
import { AudioAttachmentPlayer } from "../ui/AudioAttachmentPlayer";
import { MediaImage } from "../ui/MediaImage";

type Props = {
  memories: Memory[] | undefined;
};

export function MemoryList({ memories }: Props) {
  return (
    <div className="memory-list">
      {memories?.map((memory) => (
        <article className="ui-card memory-card" key={memory.id}>
          <MediaImage
            alt={memory.caption}
            className="memory-card-media"
            ratio="square"
            src={mediaUrl(memory.thumb_path)}
          />
          <div>
            <strong>{memory.author_name ?? "Gość"}</strong>
            {memory.author_city ? <span>{memory.author_city}</span> : null}
            <p>{memory.caption}</p>
            <p className="memory-card-note">{memory.memory_text}</p>
            <AudioAttachmentPlayer audio={memory.audio} />
          </div>
        </article>
      ))}
    </div>
  );
}
