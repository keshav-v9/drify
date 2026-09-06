import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";


interface FamilyCollaborationProps {
  user: User | null;
}

interface FamilyGroup {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

interface FamilyMember {
  id: string;
  family_group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    email: string;
  };
}

interface FamilyUpdate {
  id: string;
  family_group_id: string;
  user_id: string;
  title: string;
  content: string;
  update_type: string;
  created_at: string;
  profiles?: {
    email: string;
  };
}

const updateTypeConfig = {
  general: { label: "General" },
  expense: { label: "Expense" },
  care: { label: "Care" },
  medical: { label: "Medical" },
  urgent: { label: "Urgent" },
};

const roleConfig = {
  owner: { label: "Owner" },
  admin: { label: "Admin" },
  member: { label: "Member" },
  viewer: { label: "Viewer" },
};


const FamilyCollaboration = ({ user }: FamilyCollaborationProps) => {
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [updates, setUpdates] = useState<FamilyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [newUpdate, setNewUpdate] = useState({ title: "", content: "", type: "general" });

  useEffect(() => {
    if (user) {
      fetchFamilyGroups();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      fetchMembers();
      fetchUpdates();
    }
  }, [selectedGroup]);

  const fetchFamilyGroups = async () => {
    if (!user) return;
    
    try {
      // Get groups where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('family_group_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const groupIds = memberData?.map(m => m.family_group_id) || [];

      if (groupIds.length > 0) {
        const { data: groups, error: groupsError } = await supabase
          .from('family_groups')
          .select('*')
          .in('id', groupIds);

        if (groupsError) throw groupsError;
        setFamilyGroups(groups || []);
        
        if (groups && groups.length > 0 && !selectedGroup) {
          setSelectedGroup(groups[0]);
        }
      } else {
        setFamilyGroups([]);
      }
    } catch (error) {
      console.error('Error fetching family groups:', error);
      toast.error('Failed to load family groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!selectedGroup) return;

    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_group_id', selectedGroup.id);

      if (error) throw error;

      // Fetch profile emails separately
      const memberData: FamilyMember[] = [];
      for (const member of data || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', member.user_id)
          .single();
        
        memberData.push({
          ...member,
          profiles: profile || undefined
        });
      }
      
      setMembers(memberData);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchUpdates = async () => {
    if (!selectedGroup) return;

    try {
      const { data, error } = await supabase
        .from('family_updates')
        .select('*')
        .eq('family_group_id', selectedGroup.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile emails separately
      const updateData: FamilyUpdate[] = [];
      for (const update of data || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', update.user_id)
          .single();
        
        updateData.push({
          ...update,
          profiles: profile || undefined
        });
      }
      
      setUpdates(updateData);
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };

  const createFamilyGroup = async () => {
    if (!user || !newGroupName.trim()) return;

    try {
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('family_groups')
        .insert({
          name: newGroupName.trim(),
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_group_id: group.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      toast.success('Family group created!');
      setNewGroupName("");
      setShowCreateDialog(false);
      fetchFamilyGroups();
      setSelectedGroup(group);
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create family group');
    }
  };

  const joinFamilyGroup = async () => {
    if (!user || !joinCode.trim()) return;

    try {
      // Find the group by invite code
      const { data: group, error: groupError } = await supabase
        .from('family_groups')
        .select('*')
        .eq('invite_code', joinCode.trim().toLowerCase())
        .single();

      if (groupError || !group) {
        toast.error('Invalid invite code');
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_group_id', group.id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        toast.error('You are already a member of this group');
        return;
      }

      // Join the group
      const { error: joinError } = await supabase
        .from('family_members')
        .insert({
          family_group_id: group.id,
          user_id: user.id,
          role: 'member'
        });

      if (joinError) throw joinError;

      toast.success(`Joined "${group.name}"!`);
      setJoinCode("");
      setShowJoinDialog(false);
      fetchFamilyGroups();
      setSelectedGroup(group);
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to join family group');
    }
  };

  const copyInviteCode = () => {
    if (selectedGroup) {
      navigator.clipboard.writeText(selectedGroup.invite_code);
      toast.success('Invite code copied!');
    }
  };

  const postUpdate = async () => {
    if (!user || !selectedGroup || !newUpdate.title.trim() || !newUpdate.content.trim()) return;

    try {
      const { error } = await supabase
        .from('family_updates')
        .insert({
          family_group_id: selectedGroup.id,
          user_id: user.id,
          title: newUpdate.title.trim(),
          content: newUpdate.content.trim(),
          update_type: newUpdate.type
        });

      if (error) throw error;

      toast.success('Update posted!');
      setNewUpdate({ title: "", content: "", type: "general" });
      setShowUpdateDialog(false);
      fetchUpdates();
    } catch (error) {
      console.error('Error posting update:', error);
      toast.error('Failed to post update');
    }
  };

  const deleteUpdate = async (updateId: string) => {
    try {
      const { error } = await supabase
        .from('family_updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;
      toast.success('Update deleted');
      fetchUpdates();
    } catch (error) {
      console.error('Error deleting update:', error);
      toast.error('Failed to delete update');
    }
  };

  const leaveGroup = async () => {
    if (!user || !selectedGroup) return;

    const isOwner = members.find(m => m.user_id === user.id)?.role === 'owner';
    if (isOwner) {
      toast.error('Owners cannot leave. Transfer ownership or delete the group.');
      return;
    }

    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('family_group_id', selectedGroup.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Left the group');
      setSelectedGroup(null);
      fetchFamilyGroups();
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const createGroupDialog = (idSuffix: string) => (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create family group</DialogTitle>
        <DialogDescription>
          Everyone in the group sees the same updates, expenses and care notes.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div>
          <Label htmlFor={`groupName${idSuffix}`}>Group name</Label>
          <Input
            id={`groupName${idSuffix}`}
            placeholder="e.g. Smith family care team"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
        </div>
        <Button onClick={createFamilyGroup} size="sm" className="w-full">
          Create group
        </Button>
      </div>
    </DialogContent>
  );

  const joinGroupDialog = (idSuffix: string) => (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Join family group</DialogTitle>
        <DialogDescription>Enter the invite code shared by a family member.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div>
          <Label htmlFor={`inviteCode${idSuffix}`}>Invite code</Label>
          <Input
            id={`inviteCode${idSuffix}`}
            placeholder="8-character code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
        </div>
        <Button onClick={joinFamilyGroup} size="sm" className="w-full">
          Join group
        </Button>
      </div>
    </DialogContent>
  );

  // No groups state
  if (familyGroups.length === 0) {
    return (
      <div className="border-t border-border pt-4">
        <h3 className="text-base font-semibold leading-tight">No family group yet</h3>
        <p className="mt-1 max-w-md text-[13px] text-muted-foreground">
          A group lets siblings, partners and carers share updates and see the same expenses.
        </p>
        <div className="mt-4 flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">Create group</Button>
            </DialogTrigger>
            {createGroupDialog("A")}
          </Dialog>
          <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Join with code</Button>
            </DialogTrigger>
            {joinGroupDialog("A")}
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <Select
          value={selectedGroup?.id || ""}
          onValueChange={(value) => {
            const group = familyGroups.find(g => g.id === value);
            setSelectedGroup(group || null);
          }}
        >
          <SelectTrigger className="h-8 w-60 text-sm">
            <SelectValue placeholder="Select a group" />
          </SelectTrigger>
          <SelectContent>
            {familyGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">New group</Button>
            </DialogTrigger>
            {createGroupDialog("B")}
          </Dialog>
          <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Join</Button>
            </DialogTrigger>
            {joinGroupDialog("B")}
          </Dialog>
        </div>
      </div>

      {selectedGroup && (
        <Tabs defaultValue="updates" className="space-y-4">
          <TabsList className="h-8 bg-secondary">
            <TabsTrigger value="updates">Updates</TabsTrigger>
            <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="updates" className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-semibold">Updates</h3>
              <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">Post update</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Post update</DialogTitle>
                    <DialogDescription>Share what happened with the group.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label htmlFor="updateTitle">Title</Label>
                      <Input
                        id="updateTitle"
                        placeholder="e.g. GP appointment moved to Friday"
                        value={newUpdate.title}
                        onChange={(e) => setNewUpdate(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="updateType">Type</Label>
                      <Select
                        value={newUpdate.type}
                        onValueChange={(value) => setNewUpdate(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(updateTypeConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="updateContent">Details</Label>
                      <Textarea
                        id="updateContent"
                        placeholder="What the rest of the family needs to know…"
                        value={newUpdate.content}
                        onChange={(e) => setNewUpdate(prev => ({ ...prev, content: e.target.value }))}
                        rows={4}
                      />
                    </div>
                    <Button onClick={postUpdate} size="sm" className="w-full">
                      Post update
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {updates.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No updates yet. Post the first one so everyone stays in the loop.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {updates.map((update) => {
                  const typeConfig = updateTypeConfig[update.update_type as keyof typeof updateTypeConfig] || updateTypeConfig.general;
                  const isAuthor = update.user_id === user?.id;

                  return (
                    <div key={update.id} className="grid gap-1 py-3 sm:grid-cols-12 sm:gap-4">
                      <div className="sm:col-span-2">
                        <span className="field-label">{typeConfig.label}</span>
                        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                          {format(new Date(update.created_at), 'd MMM, HH:mm')}
                        </p>
                      </div>
                      <div className="sm:col-span-10">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-sm font-medium">{update.title}</h4>
                          {isAuthor && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteUpdate(update.id)}
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                          {update.content}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {update.profiles?.email || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members">
            <div className="border-t border-border">
              <div className="hidden grid-cols-12 gap-4 border-b border-border py-2 sm:grid">
                <span className="field-label col-span-6">Member</span>
                <span className="field-label col-span-3">Joined</span>
                <span className="field-label col-span-3">Role</span>
              </div>
              <div className="divide-y divide-border">
                {members.map((member) => {
                  const role = roleConfig[member.role as keyof typeof roleConfig] || roleConfig.member;
                  return (
                    <div key={member.id} className="grid grid-cols-12 items-center gap-4 py-2.5">
                      <span className="col-span-12 truncate text-sm sm:col-span-6">
                        {member.profiles?.email || 'Unknown'}
                      </span>
                      <span className="col-span-6 text-[13px] tabular-nums text-muted-foreground sm:col-span-3">
                        {format(new Date(member.joined_at), 'd MMM yyyy')}
                      </span>
                      <span className="col-span-6 text-[13px] text-muted-foreground sm:col-span-3">
                        {role.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="border-t border-border pt-3">
              <h3 className="text-sm font-semibold">Invite code</h3>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Share this with anyone who should see this group.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="border border-border px-3 py-1.5 font-mono text-sm tracking-[0.2em]">
                  {selectedGroup.invite_code.toUpperCase()}
                </span>
                <Button onClick={copyInviteCode} variant="outline" size="sm">
                  Copy
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <h3 className="text-sm font-semibold">Leave group</h3>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                You will lose access to its updates and expenses. Owners must transfer ownership first.
              </p>
              <Button variant="outline" size="sm" onClick={leaveGroup} className="mt-3 text-destructive">
                Leave group
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};


export default FamilyCollaboration;
