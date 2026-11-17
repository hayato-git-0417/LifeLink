import { useRef, useState, useLayoutEffect } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AppShell from '../../components/AppShell.jsx'
import Room from './Room.jsx'
import homeStyles from './HomePage.module.css'



export default function FurniturePlacementPage({ wallImage, floorImage, onPlaceFurniture, onRemoveFurniture, placedFurniture }) {
    const { state: furniture } = useLocation()

    const roomRef = useRef(null)
    const dragRef = useRef(null)
    const isEditing = furniture?.placementId != null

    const [position, setPosition] = useState(() => ({
        x: furniture?.x ?? 50,
        y: furniture?.y ?? 80,
    }))
    
    const backTo = isEditing ? '/home/customize/edit' : '/home/customize'

    const navigate = useNavigate()

    const floorRef = useRef(null)
    const [floorBounds, setFloorBounds] = useState(null)

    useLayoutEffect(() => {
        const room = roomRef.current
        const floor = floorRef.current
        if (!room || !floor) return

        function measureFloor() {
            const roomRect = room.getBoundingClientRect()
            const floorRect = floor.getBoundingClientRect()
            if (!roomRect.height || !floorRect.height) {
                setFloorBounds(null)
                return
            }

            /* 床の画像の境界線の少し下から設置を許可する */
            const floorInsetPx = 50
            setFloorBounds({
                top: ((floorRect.top + floorInsetPx - roomRect.top) / roomRect.height) * 100,
                bottom: ((floorRect.bottom - roomRect.top) / roomRect.height) * 100,
            })
        }

        measureFloor()

        const observer = new ResizeObserver(measureFloor)
        observer.observe(room)
        observer.observe(floor)
        return () => observer.disconnect()
    }, [furniture, floorImage])

    const previewRef = useRef(null)
    const [canPlace, setCanPlace] = useState(false)

    useLayoutEffect(() => {
        updateCanPlace()
    })

    function checkPlacement() {
        const preview = previewRef.current
        const room = roomRef.current
        if (!furniture || !preview?.naturalWidth || !room) return null

        const rect = preview.getBoundingClientRect()
        const overlapping = [...room.querySelectorAll('[data-placed-furniture]')]
            .filter((image) => {
                const other = image.getBoundingClientRect()

                return (
                    rect.left < other.right &&
                    rect.right > other.left &&
                    rect.top < other.bottom &&
                    rect.bottom > other.top
                )
            })

            if (overlapping.length === 0) {
                const onFloor =
                    furniture.placement === 'floor' &&
                    floorBounds !== null &&
                    position.y >= floorBounds.top &&
                    position.y <= floorBounds.bottom

                return onFloor ? { supportPlacementId: null } : null
            }

        // 重なってよいのは、座面として使う家具1つだけ
        if (overlapping.length !== 1) return null

        const [support] = overlapping
        if (!furniture.stackOn?.includes(support.dataset.stackSurface)) return null

        const seat = support.getBoundingClientRect()
        const footX = rect.left + rect.width / 2
        const footY = rect.bottom

        const supportItem = placedFurniture.find(
            (item) => String(item.placementId) === support.dataset.placementId
        )
        const area = supportItem?.stackArea ?? {
            left: 0.15,
            right: 0.85,
            top: 0.55,
            bottom: 0.78,
        }

        const onSeat =
            footX >= seat.left + seat.width * area.left &&
            footX <= seat.left + seat.width * area.right &&
            footY >= seat.top + seat.height * area.top &&
            footY <= seat.top + seat.height * area.bottom

        return onSeat && supportItem
            ? { supportPlacementId: supportItem.placementId }
            : null
    }

    function updateCanPlace() {
       setCanPlace(checkPlacement() !== null)
    }

    function startDrag(event) {
        if (!event.isPrimary || event.button !== 0) return

        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            position,
        }

        event.currentTarget.setPointerCapture(event.pointerId)
    }

    function moveFurniture(event) {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return

        const { width, height } = roomRef.current.getBoundingClientRect()
        const x = drag.position.x + ((event.clientX - drag.startX) / width) * 100
        const y = drag.position.y + ((event.clientY - drag.startY) / height) * 100

        setPosition({
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
        })
    }

    function removeFurniture() {
        if (!isEditing) return

        const hasItemsOnTop = placedFurniture.some(
            (item) => item.supportPlacementId === furniture.placementId
        )

        if (hasItemsOnTop) {
            window.alert('上に小物が置かれています。先に小物を移動するか、取り除いてください。')
            return
        }

        onRemoveFurniture(furniture.placementId)
        navigate(backTo, { replace: true })
    }

    /* 床 */
    function placeFurniture() {
        const placement = checkPlacement()
        if (!placement) return

        onPlaceFurniture({ ...furniture, ...position, ...placement })
        navigate('/home/customize/edit', { replace: true })
    }

    if (!furniture) {
        return <Navigate to="/home/customize" replace />
    }

    return (
        <AppShell bare>
            <div ref={roomRef} className={homeStyles.room}>
                <Room wallImage={wallImage} floorImage={floorImage} floorRef={floorRef}/>

                {placedFurniture
                .filter((item) => item.placementId !== furniture.placementId)
                .map((item) => (
                    <img
                        key={item.placementId}
                        src={item.image}
                        alt={item.name}
                        data-placed-furniture=""
                        data-stack-surface={item.stackSurface}
                        onLoad={updateCanPlace}
                        data-placement-id={item.placementId}
                        style={{
                            position: 'absolute',
                            left: `${item.x}%`,
                            top: `${item.y}%`,
                            width: item.displayWidth ?? 'min(30%, 160px)',
                            height: 'auto',
                            transform: 'translate(-50%, -100%)',
                            pointerEvents: 'none',
                        }}
                    />
                ))}

                <img
                    src={furniture.image}
                    alt={furniture.name}
                    ref={previewRef}
                    onLoad={updateCanPlace}
                    draggable={false}
                    onPointerDown={startDrag}
                    onPointerMove={moveFurniture}
                    onLostPointerCapture={() => { dragRef.current = null }}
                    style={{
                        position: 'absolute',
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        width: furniture.displayWidth ?? 'min(30%, 160px)',
                        height: 'auto',
                        transform: 'translate(-50%, -100%)',
                        touchAction: 'none',
                        userSelect: 'none',
                        cursor: 'grab',
                        zIndex: 1,
                        outline: `2px dashed ${canPlace ? '#2563eb' : '#dc2626'}`,
                        outlineOffset: 3,
                    }}
                />

                
                <div className={homeStyles.placementActions}>

                    {isEditing && (
                        <button
                            type="button"
                            className={`${homeStyles.button} ${homeStyles.placementAction} ${homeStyles.removeAction}`}
                            onClick={removeFurniture}
                        >
                            削除
                        </button>

                    )}

                    <button
                        type="button"
                        className={`${homeStyles.button} ${homeStyles.placementAction}`}
                        disabled={!canPlace}
                        onClick={placeFurniture}
                    >
                        設置
                    </button>

                    <button
                        type="button"
                        className={`${homeStyles.button} ${homeStyles.placementAction} ${homeStyles.cancelAction}`}
                        onClick={() => navigate(backTo, { replace: true })}
                    >
                        キャンセル
                    </button>
                </div>
            </div>
        </AppShell>
    )
}