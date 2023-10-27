import { useParams } from "react-router-dom"

export default function Viewer() {
  const data_id = useParams<{ data_id: string }>().data_id
  return <div>{data_id}</div>
}